package usecase

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	finDto "github.com/gilabs/gims/api/internal/finance/domain/dto"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gilabs/gims/api/internal/sales/data/models"
	"github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/mapper"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrSalesPaymentNotFound = errors.New("sales payment not found")
	ErrSalesPaymentConflict = errors.New("sales payment conflict")
)

type SalesPaymentUsecase interface {
	AddData(ctx context.Context) (*dto.SalesPaymentAddResponse, error)
	List(ctx context.Context, params repositories.SalesPaymentListParams) ([]*dto.SalesPaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateSalesPaymentRequest) (*dto.SalesPaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Confirm(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesPaymentAuditTrailEntry, int64, error)
	ExportCSV(ctx context.Context, params repositories.SalesPaymentListParams) ([]byte, error)
}

type salesPaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.SalesPaymentRepository
	auditService audit.AuditService
	mapper       *mapper.SalesPaymentMapper
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
}

func NewSalesPaymentUsecase(
	db *gorm.DB,
	repo repositories.SalesPaymentRepository,
	auditService audit.AuditService,
	journalUC finUsecase.JournalEntryUsecase,
	coaUC finUsecase.ChartOfAccountUsecase,
) SalesPaymentUsecase {
	return &salesPaymentUsecase{
		db:           db,
		repo:         repo,
		auditService: auditService,
		mapper:       mapper.NewSalesPaymentMapper(),
		journalUC:    journalUC,
		coaUC:        coaUC,
	}
}

func (uc *salesPaymentUsecase) AddData(ctx context.Context) (*dto.SalesPaymentAddResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	// Fetch active bank accounts
	var bankAccounts []coreModels.BankAccount
	if err := uc.db.WithContext(ctx).
		Model(&coreModels.BankAccount{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&bankAccounts).Error; err != nil {
		return nil, err
	}

	baItems := make([]*dto.SalesPaymentBankAccountSummary, 0, len(bankAccounts))
	for i := range bankAccounts {
		ba := bankAccounts[i]
		baItems = append(baItems, &dto.SalesPaymentBankAccountSummary{
			ID:            ba.ID,
			Name:          ba.Name,
			AccountNumber: ba.AccountNumber,
			AccountHolder: ba.AccountHolder,
			Currency:      ba.Currency,
		})
	}

	// Fetch eligible invoices (unpaid or partial, both regular and down_payment)
	var invoices []*models.CustomerInvoice
	if err := uc.db.WithContext(ctx).
		Model(&models.CustomerInvoice{}).
		Preload("SalesOrder").
		Where("status IN ?", []models.CustomerInvoiceStatus{
			models.CustomerInvoiceStatusUnpaid,
			models.CustomerInvoiceStatusPartial,
		}).
		Order("created_at DESC").
		Find(&invoices).Error; err != nil {
		return nil, err
	}

	invItems := make([]*dto.SalesPaymentAddInvoiceItem, 0, len(invoices))
	for _, inv := range invoices {
		var soObj *struct {
			ID   string `json:"id"`
			Code string `json:"code"`
		}
		if inv.SalesOrder != nil {
			soObj = &struct {
				ID   string `json:"id"`
				Code string `json:"code"`
			}{ID: inv.SalesOrder.ID, Code: inv.SalesOrder.Code}
		}

		var dueDate *string
		if inv.DueDate != nil {
			dd := inv.DueDate.Format("2006-01-02")
			dueDate = &dd
		}

		invItems = append(invItems, &dto.SalesPaymentAddInvoiceItem{
			ID:              inv.ID,
			SalesOrder:      soObj,
			Code:            inv.Code,
			InvoiceNumber:   inv.InvoiceNumber,
			Type:            string(inv.Type),
			InvoiceDate:     inv.InvoiceDate.Format("2006-01-02"),
			DueDate:         dueDate,
			Amount:          inv.Amount,
			PaidAmount:      inv.PaidAmount,
			RemainingAmount: inv.RemainingAmount,
			Status:          string(inv.Status),
		})
	}

	return &dto.SalesPaymentAddResponse{BankAccounts: baItems, Invoices: invItems}, nil
}

func (uc *salesPaymentUsecase) List(ctx context.Context, params repositories.SalesPaymentListParams) ([]*dto.SalesPaymentListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *salesPaymentUsecase) GetByID(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error) {
	p, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalesPaymentNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(p), nil
}

func (uc *salesPaymentUsecase) Create(ctx context.Context, req *dto.CreateSalesPaymentRequest) (*dto.SalesPaymentDetailResponse, error) {
	if req == nil {
		return nil, errors.New("request is nil")
	}
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	method := strings.ToUpper(strings.TrimSpace(req.Method))
	if method != string(models.SalesPaymentMethodBank) && method != string(models.SalesPaymentMethodCash) {
		return nil, ErrSalesPaymentConflict
	}

	var createdID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.CustomerInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, "id = ?", strings.TrimSpace(req.InvoiceID)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("customer invoice not found")
			}
			return err
		}
		if inv.Status != models.CustomerInvoiceStatusUnpaid && inv.Status != models.CustomerInvoiceStatusPartial {
			return ErrSalesPaymentConflict
		}

		var ba coreModels.BankAccount
		if err := tx.First(&ba, "id = ?", strings.TrimSpace(req.BankAccountID)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("bank account not found")
			}
			return err
		}
		if !ba.IsActive {
			return ErrSalesPaymentConflict
		}

		amount := math.Max(0, req.Amount)
		if amount <= 0 {
			return ErrSalesPaymentConflict
		}

		p := &models.SalesPayment{
			CustomerInvoiceID:           inv.ID,
			BankAccountID:               ba.ID,
			PaymentDate:                 strings.TrimSpace(req.PaymentDate),
			Amount:                      amount,
			Method:                      models.SalesPaymentMethod(method),
			Status:                      models.SalesPaymentStatusPending,
			ReferenceNumber:             req.ReferenceNumber,
			Notes:                       req.Notes,
			CreatedBy:                   actorID,
			BankAccountNameSnapshot:     strings.TrimSpace(ba.Name),
			BankAccountNumberSnapshot:   strings.TrimSpace(ba.AccountNumber),
			BankAccountHolderSnapshot:   strings.TrimSpace(ba.AccountHolder),
			BankAccountCurrencySnapshot: strings.TrimSpace(ba.Currency),
		}
		if err := tx.Create(p).Error; err != nil {
			return err
		}
		createdID = p.ID
		return nil
	})
	if err != nil {
		return nil, err
	}

	out, err := uc.repo.GetByID(ctx, createdID)
	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "sales_payment.create", out.ID, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *salesPaymentUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSalesPaymentNotFound
		}
		return err
	}
	if existing.Status != models.SalesPaymentStatusPending {
		return ErrSalesPaymentConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "sales_payment.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *salesPaymentUsecase) Confirm(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error) {
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var confirmedID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var pay models.SalesPayment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pay, "id = ?", id).Error; err != nil {
			return err
		}
		if pay.Status != models.SalesPaymentStatusPending {
			return ErrSalesPaymentConflict
		}

		var inv models.CustomerInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, "id = ?", pay.CustomerInvoiceID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("customer invoice not found")
			}
			return err
		}
		if inv.Status != models.CustomerInvoiceStatusUnpaid && inv.Status != models.CustomerInvoiceStatusPartial {
			return ErrSalesPaymentConflict
		}

		// Sum already confirmed payments to avoid over-paying
		type sumRow struct{ Total float64 }
		var row sumRow
		if err := tx.Model(&models.SalesPayment{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("customer_invoice_id = ?", inv.ID).
			Where("status = ?", models.SalesPaymentStatusConfirmed).
			Scan(&row).Error; err != nil {
			return err
		}
		if row.Total+pay.Amount > inv.Amount+0.0001 {
			return ErrSalesPaymentConflict
		}

		if err := tx.Model(&pay).Updates(map[string]interface{}{
			"status":     models.SalesPaymentStatusConfirmed,
			"updated_at": apptime.Now(),
		}).Error; err != nil {
			return err
		}

		// Update invoice status based on total payments
		newTotal := row.Total + pay.Amount
		newStatus := models.CustomerInvoiceStatusPartial
		if newTotal >= inv.Amount-0.0001 {
			newStatus = models.CustomerInvoiceStatusPaid
		}

		updateData := map[string]interface{}{
			"status":           newStatus,
			"paid_amount":      newTotal,
			"remaining_amount": math.Max(0, inv.Amount-newTotal),
			"updated_at":       apptime.Now(),
		}
		if newStatus == models.CustomerInvoiceStatusPaid {
			now := apptime.Now()
			updateData["payment_at"] = &now
		}
		if err := tx.Model(&inv).Updates(updateData).Error; err != nil {
			return err
		}

		// If regular invoice is fully paid and it has a SalesOrder, close the SO
		if newStatus == models.CustomerInvoiceStatusPaid && inv.Type == models.CustomerInvoiceTypeRegular && inv.SalesOrderID != nil {
			var so models.SalesOrder
			if err := tx.First(&so, "id = ?", *inv.SalesOrderID).Error; err == nil {
				_ = tx.Model(&so).Update("status", "closed").Error
			}
		}

		// When a DP Invoice becomes paid, update existing Regular Invoices on the same SO
		if newStatus == models.CustomerInvoiceStatusPaid && inv.Type == models.CustomerInvoiceTypeDownPayment && inv.SalesOrderID != nil {
			// Sum all paid DP amounts for this SO
			type dpSumRow struct{ Total float64 }
			var dpSum dpSumRow
			if err := tx.Model(&models.CustomerInvoice{}).
				Select("COALESCE(SUM(paid_amount),0) as total").
				Where("sales_order_id = ?", *inv.SalesOrderID).
				Where("type = ?", models.CustomerInvoiceTypeDownPayment).
				Where("status = ?", models.CustomerInvoiceStatusPaid).
				Where("deleted_at IS NULL").
				Scan(&dpSum).Error; err != nil {
				return err
			}

			// Find all Regular Invoices on the same SO and update them
			var regularInvoices []models.CustomerInvoice
			if err := tx.Where("sales_order_id = ?", *inv.SalesOrderID).
				Where("type = ?", models.CustomerInvoiceTypeRegular).
				Where("deleted_at IS NULL").
				Find(&regularInvoices).Error; err != nil {
				return err
			}

			for _, regInv := range regularInvoices {
				// Recalculate: original amount = subtotal + tax + delivery + other
				originalAmount := regInv.Subtotal + regInv.TaxAmount + regInv.DeliveryCost + regInv.OtherCost
				newAmount := math.Max(0, originalAmount-dpSum.Total)
				newRemaining := math.Max(0, newAmount-regInv.PaidAmount)

				dpInvID := inv.ID
				regUpdates := map[string]interface{}{
					"down_payment_invoice_id": &dpInvID,
					"down_payment_amount":     dpSum.Total,
					"amount":                  newAmount,
					"remaining_amount":        newRemaining,
					"updated_at":              apptime.Now(),
				}
				if err := tx.Model(&models.CustomerInvoice{}).Where("id = ?", regInv.ID).Updates(regUpdates).Error; err != nil {
					return err
				}
				fmt.Printf("✅ Updated Regular Invoice %s: DP deducted %.2f, new amount %.2f\n", regInv.Code, dpSum.Total, newAmount)
			}
		}

		confirmedID = pay.ID
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrSalesPaymentNotFound
		}
		return nil, err
	}

	out, err := uc.repo.GetByID(ctx, confirmedID)
	if err != nil {
		return nil, err
	}

	// Trigger journal entry for this payment
	if err := uc.triggerJournalEntry(ctx, out); err != nil {
		// Log error but don't fail the confirm
		fmt.Printf("⚠️ Failed to create journal entry for sales payment %s: %v\n", id, err)
	}

	uc.auditService.Log(ctx, "sales_payment.confirm", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *salesPaymentUsecase) triggerJournalEntry(ctx context.Context, pay *models.SalesPayment) error {
	// Debit: Cash/Bank (from BankAccount.ChartOfAccountID)
	// Credit: Trade Receivables (11300) for regular invoices
	//         OR Sales Advances/DP (21200) for down payment invoices

	var ba coreModels.BankAccount
	if pay.BankAccount != nil && pay.BankAccount.ChartOfAccountID != nil {
		ba = *pay.BankAccount
	} else {
		if err := uc.db.WithContext(ctx).First(&ba, "id = ?", pay.BankAccountID).Error; err != nil {
			return err
		}
	}

	var debitAccountID string
	if ba.ChartOfAccountID != nil {
		debitAccountID = *ba.ChartOfAccountID
	} else {
		// Fallback to cash account
		def, err := uc.coaUC.GetByCode(ctx, "11100")
		if err != nil {
			return errors.New("bank account has no linked COA and default cash account 11100 not found")
		}
		debitAccountID = def.ID
	}

	// Determine credit account based on invoice type
	var creditAccountCode string
	var description string
	if pay.CustomerInvoice != nil && pay.CustomerInvoice.Type == models.CustomerInvoiceTypeDownPayment {
		creditAccountCode = "21200" // Sales Advances / Uang Muka Penjualan
		description = "Customer Down Payment"
	} else {
		creditAccountCode = "11300" // Trade Receivables / Piutang Usaha
		description = "Customer Payment"
	}

	creditAcct, err := uc.coaUC.GetByCode(ctx, creditAccountCode)
	if err != nil {
		return err
	}

	refNum := ""
	if pay.ReferenceNumber != nil {
		refNum = *pay.ReferenceNumber
	}

	lines := []finDto.JournalLineRequest{
		{
			ChartOfAccountID: debitAccountID,
			Debit:            pay.Amount,
			Credit:           0,
			Memo:             fmt.Sprintf("Inbound Payment %s", refNum),
		},
		{
			ChartOfAccountID: creditAcct.ID,
			Debit:            0,
			Credit:           pay.Amount,
			Memo:             fmt.Sprintf("Payment for %s", refNum),
		},
	}

	refID := pay.ID
	refType := "SALES_PAYMENT"

	req := &finDto.CreateJournalEntryRequest{
		EntryDate:     pay.PaymentDate,
		Description:   fmt.Sprintf("%s %s", description, refNum),
		ReferenceID:   &refID,
		ReferenceType: &refType,
		Lines:         lines,
	}

	_, err = uc.journalUC.Create(ctx, req)
	return err
}

func (uc *salesPaymentUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesPaymentAuditTrailEntry, int64, error) {
	if uc.db == nil {
		return nil, 0, errors.New("db is nil")
	}
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	tx := uc.db.WithContext(ctx).Model(&coreModels.AuditLog{}).
		Where("audit_logs.target_id = ?", id).
		Where("audit_logs.permission_code LIKE ?", "sales_payment.%")

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	type auditRow struct {
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

	rows := make([]auditRow, 0)
	if err := tx.
		Select("audit_logs.id, audit_logs.actor_id, audit_logs.permission_code, audit_logs.target_id, audit_logs.action, audit_logs.metadata, audit_logs.created_at, users.email as actor_email, users.name as actor_name").
		Joins("LEFT JOIN users ON users.id = audit_logs.actor_id").
		Order("audit_logs.created_at DESC").
		Limit(perPage).
		Offset((page - 1) * perPage).
		Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	entries := make([]dto.SalesPaymentAuditTrailEntry, 0, len(rows))
	for _, r := range rows {
		metaMap := map[string]interface{}{}
		if strings.TrimSpace(r.Metadata) != "" {
			_ = json.Unmarshal([]byte(r.Metadata), &metaMap)
		}
		entries = append(entries, dto.SalesPaymentAuditTrailEntry{
			ID:             r.ID,
			ActorID:        r.ActorID,
			ActorEmail:     r.ActorEmail,
			ActorName:      r.ActorName,
			PermissionCode: r.PermissionCode,
			Action:         r.Action,
			Metadata:       metaMap,
			CreatedAt:      r.CreatedAt,
		})
	}

	return entries, total, nil
}

func (uc *salesPaymentUsecase) ExportCSV(ctx context.Context, params repositories.SalesPaymentListParams) ([]byte, error) {
	items, _, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	buf := &strings.Builder{}
	w := csv.NewWriter(buf)
	_ = w.Write([]string{"id", "invoice_code", "invoice_type", "bank_account", "payment_date", "amount", "method", "status", "created_at"})

	for _, it := range items {
		invCode := ""
		invType := ""
		if it.CustomerInvoice != nil {
			invCode = it.CustomerInvoice.Code
			invType = string(it.CustomerInvoice.Type)
		}
		bankName := ""
		if it.BankAccount != nil {
			bankName = it.BankAccount.Name
		}
		_ = w.Write([]string{
			it.ID,
			invCode,
			invType,
			bankName,
			it.PaymentDate,
			strconv.FormatFloat(it.Amount, 'f', 2, 64),
			string(it.Method),
			string(it.Status),
			it.CreatedAt.Format(time.RFC3339),
		})
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, err
	}
	return []byte(buf.String()), nil
}
