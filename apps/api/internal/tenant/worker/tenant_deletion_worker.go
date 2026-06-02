package worker

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/resend"
	"github.com/gilabs/gims/api/internal/core/storage"
	userUsecase "github.com/gilabs/gims/api/internal/user/domain/usecase"
	"gorm.io/gorm"
)

var urlExtractorPattern = regexp.MustCompile(`https?://[^\s"'<>]+`)

type tenantDeletionCandidate struct {
	ID          string
	ScheduledAt *time.Time
}

type tenantTable struct {
	Name string `gorm:"column:table_name"`
}

type tenantURLColumn struct {
	TableName  string `gorm:"column:table_name"`
	ColumnName string `gorm:"column:column_name"`
}

type TenantDeletionWorker struct {
	db           *gorm.DB
	ticker       *time.Ticker
	stopChan     chan struct{}
	resendClient *resend.Client
}

func NewTenantDeletionWorker(db *gorm.DB, interval time.Duration, resendClient *resend.Client) *TenantDeletionWorker {
	if interval <= 0 {
		interval = 12 * time.Hour
	}
	return &TenantDeletionWorker{
		db:           db,
		ticker:       time.NewTicker(interval),
		stopChan:     make(chan struct{}),
		resendClient: resendClient,
	}
}

func (w *TenantDeletionWorker) Start() {
	log.Println("Tenant deletion worker started")

	go func() {
		w.processDueTenants()
		w.sendWarningEmails()
		for {
			select {
			case <-w.ticker.C:
				w.processDueTenants()
				w.sendWarningEmails()
			case <-w.stopChan:
				log.Println("Tenant deletion worker stopped")
				return
			}
		}
	}()
}

func (w *TenantDeletionWorker) Stop() {
	w.ticker.Stop()
	close(w.stopChan)
}

func (w *TenantDeletionWorker) processDueTenants() {
	ctx := context.Background()
	now := time.Now()

	var tenants []tenantDeletionCandidate
	err := w.db.WithContext(ctx).
		Table("tenants").
		Select("id, deletion_scheduled_at").
		Where("deleted_at IS NULL AND status = ? AND (deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= ?)", "pending_deletion", now).
		Find(&tenants).Error
	if err != nil {
		log.Printf("tenant deletion worker: failed to load due tenants: %v", err)
		return
	}

	for _, tenant := range tenants {
		if tenant.ID == "" {
			continue
		}
		if err := w.hardDeleteTenant(ctx, tenant.ID); err != nil {
			log.Printf("tenant deletion worker: failed hard-delete for tenant %s: %v", tenant.ID, err)
		}
	}
}

func (w *TenantDeletionWorker) hardDeleteTenant(ctx context.Context, tenantID string) error {
	return w.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		urls, err := w.collectTenantFileURLs(ctx, tx, tenantID)
		if err != nil {
			return err
		}

		// Break owner FK so user rows can be removed safely during tenant purge.
		if err := tx.WithContext(ctx).
			Exec(`UPDATE tenants SET owner_user_id = NULL WHERE id = ?`, tenantID).Error; err != nil {
			return err
		}

		if err := w.deleteTenantRows(ctx, tx, tenantID); err != nil {
			return err
		}

		if err := tx.WithContext(ctx).Exec(`DELETE FROM tenants WHERE id = ?`, tenantID).Error; err != nil {
			return err
		}

		for _, rawURL := range urls {
			key := storage.KeyFromURL(rawURL)
			if key == "" {
				continue
			}
			_ = storage.Delete(ctx, key)
		}

		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("avatars/%s", tenantID))
		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("products/%s", tenantID))
		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("visits/%s", tenantID))
		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("signatures/%s", tenantID))
		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("documents/%s", tenantID))
		_ = storage.DeleteByPrefix(ctx, fmt.Sprintf("uploads/%s", tenantID))

		return nil
	})
}

func (w *TenantDeletionWorker) collectTenantFileURLs(ctx context.Context, tx *gorm.DB, tenantID string) ([]string, error) {
	var columns []tenantURLColumn
	err := tx.WithContext(ctx).Raw(`
		SELECT c.table_name, c.column_name
		FROM information_schema.columns c
		JOIN information_schema.tables t
		  ON t.table_schema = c.table_schema
		 AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND t.table_type = 'BASE TABLE'
		  AND c.table_name IN (
			SELECT table_name
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND column_name = 'tenant_id'
		  )
		  AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
	`).Scan(&columns).Error
	if err != nil {
		return nil, err
	}

	seen := map[string]struct{}{}
	urls := make([]string, 0)

	for _, col := range columns {
		query := fmt.Sprintf(
			"SELECT %s::text AS value FROM %s WHERE tenant_id = ? AND %s IS NOT NULL",
			quoteIdentifier(col.ColumnName),
			quoteIdentifier(col.TableName),
			quoteIdentifier(col.ColumnName),
		)

		var rows []struct {
			Value string `gorm:"column:value"`
		}
		if err := tx.WithContext(ctx).Raw(query, tenantID).Scan(&rows).Error; err != nil {
			continue
		}

		for _, row := range rows {
			matches := urlExtractorPattern.FindAllString(row.Value, -1)
			for _, candidate := range matches {
				normalized := strings.TrimSpace(strings.Trim(candidate, `"`))
				if normalized == "" {
					continue
				}
				if _, ok := seen[normalized]; ok {
					continue
				}
				if storage.KeyFromURL(normalized) == "" {
					continue
				}
				seen[normalized] = struct{}{}
				urls = append(urls, normalized)
			}
		}
	}

	sort.Strings(urls)
	return urls, nil
}

func (w *TenantDeletionWorker) deleteTenantRows(ctx context.Context, tx *gorm.DB, tenantID string) error {
	var tables []tenantTable
	err := tx.WithContext(ctx).Raw(`
		SELECT DISTINCT c.table_name
		FROM information_schema.columns c
		JOIN information_schema.tables t
		  ON t.table_schema = c.table_schema
		 AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND t.table_type = 'BASE TABLE'
		  AND c.column_name = 'tenant_id'
		  AND c.table_name <> 'tenants'
	`).Scan(&tables).Error
	if err != nil {
		return err
	}

	pending := make([]string, 0, len(tables))
	for _, row := range tables {
		pending = append(pending, row.Name)
	}

	// Delete in passes with savepoints to avoid FK ordering assumptions.
	for pass := 0; pass < len(pending)+2 && len(pending) > 0; pass++ {
		next := make([]string, 0, len(pending))
		progress := false

		for idx, table := range pending {
			savepoint := fmt.Sprintf("tenant_del_%d_%d", pass, idx)
			if err := tx.Exec("SAVEPOINT " + savepoint).Error; err != nil {
				return err
			}

			query := fmt.Sprintf("DELETE FROM %s WHERE tenant_id = ?", quoteIdentifier(table))
			err := tx.WithContext(ctx).Exec(query, tenantID).Error
			if err != nil {
				_ = tx.Exec("ROLLBACK TO SAVEPOINT " + savepoint).Error
				next = append(next, table)
				_ = tx.Exec("RELEASE SAVEPOINT " + savepoint).Error
				continue
			}

			progress = true
			_ = tx.Exec("RELEASE SAVEPOINT " + savepoint).Error
		}

		pending = next
		if !progress && len(pending) > 0 {
			return fmt.Errorf("failed to delete tenant rows due to unresolved FK dependencies for tables: %s", strings.Join(pending, ", "))
		}
	}

	if len(pending) > 0 {
		return fmt.Errorf("failed to delete tenant rows for tables: %s", strings.Join(pending, ", "))
	}

	return nil
}

func quoteIdentifier(identifier string) string {
	return `"` + strings.ReplaceAll(identifier, `"`, `""`) + `"`
}

func (w *TenantDeletionWorker) sendWarningEmails() {
	ctx := context.Background()
	now := time.Now()

	type pendingTenant struct {
		ID                  string
		OwnerUserID         *string
		DeletionScheduledAt *time.Time
		DeletionWarningSent bool
		DeletionH1Sent      bool
	}

	var tenants []pendingTenant
	err := w.db.WithContext(ctx).
		Table("tenants").
		Select("id, owner_user_id, deletion_scheduled_at, deletion_warning_sent, deletion_h1_sent").
		Where("deleted_at IS NULL AND status = ?", "pending_deletion").
		Find(&tenants).Error
	if err != nil {
		log.Printf("tenant deletion worker: failed to load pending tenants for warning emails: %v", err)
		return
	}

	for _, tenant := range tenants {
		if tenant.DeletionScheduledAt == nil || tenant.OwnerUserID == nil || *tenant.OwnerUserID == "" {
			continue
		}

		remaining := tenant.DeletionScheduledAt.Sub(now)

		// 1. Day 25 warning (5 days remaining)
		if remaining <= 5*24*time.Hour && remaining > 24*time.Hour && !tenant.DeletionWarningSent {
			w.dispatchWarningEmail(ctx, tenant.ID, *tenant.OwnerUserID, *tenant.DeletionScheduledAt, 5)
			w.db.WithContext(ctx).
				Table("tenants").
				Where("id = ?", tenant.ID).
				Update("deletion_warning_sent", true)
		}

		// 2. Day 29 / H-1 warning (1 day remaining)
		if remaining <= 24*time.Hour && remaining > 0 && !tenant.DeletionH1Sent {
			w.dispatchWarningEmail(ctx, tenant.ID, *tenant.OwnerUserID, *tenant.DeletionScheduledAt, 1)
			w.db.WithContext(ctx).
				Table("tenants").
				Where("id = ?", tenant.ID).
				Update("deletion_h1_sent", true)
		}
	}
}

func (w *TenantDeletionWorker) dispatchWarningEmail(ctx context.Context, tenantID string, ownerUserID string, scheduledAt time.Time, daysRemaining int) {
	if w.resendClient == nil {
		return
	}

	var ownerUser struct {
		Email string
		Name  string
	}
	err := w.db.WithContext(ctx).
		Table("users").
		Select("email, name").
		Where("id = ? AND deleted_at IS NULL", ownerUserID).
		First(&ownerUser).Error
	if err != nil || ownerUser.Email == "" {
		return
	}

	fromEmail := "Salesview <cs@gilabs.id>"
	if config.AppConfig != nil && config.AppConfig.Resend.FromEmail != "" {
		fromEmail = config.AppConfig.Resend.FromEmail
	}

	tmpl, err := template.New("deletion_warning").Parse(userUsecase.DeletionWarningEmailTemplate)
	if err != nil {
		return
	}

	var body bytes.Buffer
	err = tmpl.Execute(&body, struct {
		Name          string
		Email         string
		ScheduledDate string
		DaysRemaining int
		Year          int
	}{
		Name:          ownerUser.Name,
		Email:         ownerUser.Email,
		ScheduledDate: scheduledAt.Format("02 January 2006"),
		DaysRemaining: daysRemaining,
		Year:          time.Now().Year(),
	})
	if err != nil {
		return
	}

	subject := fmt.Sprintf("[Salesview] PERINGATAN: Akun Anda Akan Dihapus Permanen dalam %d Hari", daysRemaining)
	if daysRemaining == 1 {
		subject = "[Salesview] PERINGATAN TERAKHIR: Akun Anda Akan Dihapus Permanen Besok"
	}

	_, _ = w.resendClient.SendEmail(ctx, &resend.SendEmailRequest{
		From:    fromEmail,
		To:      []string{ownerUser.Email},
		Subject: subject,
		HTML:    body.String(),
	})
}
