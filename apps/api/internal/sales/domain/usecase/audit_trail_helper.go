package usecase

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"gorm.io/gorm"
)

type salesAuditRow struct {
	ID             string    `gorm:"column:id"`
	ActorID        string    `gorm:"column:actor_id"`
	PermissionCode string    `gorm:"column:permission_code"`
	TargetID       string    `gorm:"column:target_id"`
	Action         string    `gorm:"column:action"`
	Metadata       string    `gorm:"column:metadata"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	ActorEmail     *string   `gorm:"column:actor_email"`
	ActorName      *string   `gorm:"column:actor_name"`
}

func listAuditTrailEntries(
	ctx context.Context,
	db *gorm.DB,
	targetID string,
	permissionPrefix string,
	page int,
	perPage int,
) ([]dto.CustomerInvoiceAuditTrailEntry, int64, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	tx := db.WithContext(ctx).Model(&coreModels.AuditLog{}).
		Where("audit_logs.target_id = ?", targetID).
		Where("audit_logs.permission_code LIKE ?", permissionPrefix+"%")

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := make([]salesAuditRow, 0)
	if err := tx.
		Select("audit_logs.id, audit_logs.actor_id, audit_logs.permission_code, audit_logs.target_id, audit_logs.action, audit_logs.metadata, audit_logs.created_at, users.email as actor_email, users.name as actor_name").
		Joins("LEFT JOIN users ON users.id = audit_logs.actor_id").
		Order("audit_logs.created_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	entries := make([]dto.CustomerInvoiceAuditTrailEntry, 0, len(rows))
	for _, row := range rows {
		metadata := parseAuditMetadata(row.Metadata)
		user := buildAuditTrailUser(row.ActorID, row.ActorEmail, row.ActorName)

		entries = append(entries, dto.CustomerInvoiceAuditTrailEntry{
			ID:             row.ID,
			Action:         row.Action,
			PermissionCode: row.PermissionCode,
			TargetID:       row.TargetID,
			Metadata:       metadata,
			User:           user,
			CreatedAt:      row.CreatedAt,
		})
	}

	return entries, total, nil
}

func parseAuditMetadata(raw string) map[string]interface{} {
	metadata := map[string]interface{}{}
	if strings.TrimSpace(raw) == "" {
		return metadata
	}

	_ = json.Unmarshal([]byte(raw), &metadata)
	return metadata
}

func buildAuditTrailUser(actorID string, actorEmail, actorName *string) *dto.AuditTrailUser {
	if actorID == "" {
		return nil
	}

	user := &dto.AuditTrailUser{ID: actorID, Email: "", Name: ""}
	if actorEmail != nil {
		user.Email = *actorEmail
	}
	if actorName != nil {
		user.Name = *actorName
	}

	return user
}

func logSalesAudit(auditService audit.AuditService, ctx context.Context, action string, targetID string, metadata map[string]interface{}) {
	if auditService == nil || strings.TrimSpace(action) == "" || strings.TrimSpace(targetID) == "" {
		return
	}
	auditService.Log(ctx, action, targetID, metadata)
}
