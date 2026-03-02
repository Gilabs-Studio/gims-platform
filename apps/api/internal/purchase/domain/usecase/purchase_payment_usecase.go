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
	"github.com/gilabs/gims/api/internal/purchase/data/models"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/mapper"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrPurchasePaymentNotFound = errors.New("purchase payment not found")
	ErrPurchasePaymentConflict = errors.New("purchase payment conflict")
)

type PurchasePaymentUsecase interface {
	AddData(ctx context.Context) (*dto.PurchasePaymentAddResponse, error)
	List(ctx context.Context, params repositories.PurchasePaymentListParams) ([]*dto.PurchasePaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreatePurchasePaymentRequest) (*dto.PurchasePaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Confirm(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchasePaymentAuditTrailEntry, int64, error)
	ExportCSV(ctx context.Context, params repositories.PurchasePaymentListParams) ([]byte, error)
}

type purchasePaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.PurchasePaymentRepository
	siRepo       repositories.SupplierInvoiceRepository
	auditService audit.AuditService
	mapper       *mapper.PurchasePaymentMapper
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
}

func NewPurchasePaymentUsecase(db *gorm.DB, repo repositories.PurchasePaymentRepository, siRepo repositories.SupplierInvoiceRepository, auditService audit.AuditService, journalUC finUsecase.JournalEntryUsecase, coaUC finUsecase.ChartOfAccountUsecase) PurchasePaymentUsecase {
	return &purchasePaymentUsecase{db: db, repo: repo, siRepo: siRepo, auditService: auditService, mapper: mapper.NewPurchasePaymentMapper(), journalUC: journalUC, coaUC: coaUC}
}

func (uc *purchasePaymentUsecase) AddData(ctx context.Context) (*dto.PurchasePaymentAddResponse, error) {
	if uc.db == nil {
		return nil, errors.New("db is nil")
	}

	var bankAccounts []coreModels.BankAccount
	if err := uc.db.WithContext(ctx).
		Model(&coreModels.BankAccount{}).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&bankAccounts).Error; err != nil {
		return nil, err
	}

	baItems := make([]*dto.PurchasePaymentBankAccountSummary, 0, len(bankAccounts))
	for i := range bankAccounts {
		ba := bankAccounts[i]
		baItems = append(baItems, &dto.PurchasePaymentBankAccountSummary{ID: ba.ID, Name: ba.Name, AccountNumber: ba.AccountNumber, AccountHolder: ba.AccountHolder, Currency: ba.Currency})
	}

	var invoices []*models.SupplierInvoice
	if err := uc.db.WithContext(ctx).
		Model(&models.SupplierInvoice{}).
		Preload("PurchaseOrder").
		Where("status IN ?", []models.SupplierInvoiceStatus{models.SupplierInvoiceStatusUnpaid, models.SupplierInvoiceStatusPartial}).
		Order("created_at DESC").
		Find(&invoices).Error; err != nil {
		return nil, err
	}

	invItems := make([]*dto.PurchasePaymentAddInvoiceItem, 0, len(invoices))
	for _, inv := range invoices {
		var poObj *struct {
			ID   string `json:"id"`
			Code string `json:"code"`
		}
		if inv.PurchaseOrder != nil {
			poObj = &struct {
				ID   string `json:"id"`
				Code string `json:"code"`
			}{ID: inv.PurchaseOrder.ID, Code: inv.PurchaseOrder.Code}
		}

		invItems = append(invItems, &dto.PurchasePaymentAddInvoiceItem{
			ID:              inv.ID,
			PurchaseOrder:   poObj,
			Code:            inv.Code,
			InvoiceNumber:   inv.InvoiceNumber,
			Type:            string(inv.Type),
			InvoiceDate:     inv.InvoiceDate,
			DueDate:         inv.DueDate,
			Amount:          inv.Amount,
			PaidAmount:      inv.PaidAmount,
			RemainingAmount: inv.RemainingAmount,
			Status:          string(inv.Status),
		})
	}

	return &dto.PurchasePaymentAddResponse{BankAccounts: baItems, Invoices: invItems}, nil
}

func (uc *purchasePaymentUsecase) List(ctx context.Context, params repositories.PurchasePaymentListParams) ([]*dto.PurchasePaymentListResponse, int64, error) {
	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return uc.mapper.ToListResponseList(items), total, nil
}

func (uc *purchasePaymentUsecase) GetByID(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error) {
	p, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchasePaymentNotFound
		}
		return nil, err
	}
	return uc.mapper.ToDetailResponse(p), nil
}

func (uc *purchasePaymentUsecase) Create(ctx context.Context, req *dto.CreatePurchasePaymentRequest) (*dto.PurchasePaymentDetailResponse, error) {
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
	if method != string(models.PurchasePaymentMethodBank) && method != string(models.PurchasePaymentMethodCash) {
		return nil, ErrPurchasePaymentConflict
	}

	var createdID string
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inv models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, "id = ?", strings.TrimSpace(req.InvoiceID)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrSupplierInvoiceNotFound
			}
			return err
		}
		if inv.Status != models.SupplierInvoiceStatusUnpaid && inv.Status != models.SupplierInvoiceStatusPartial {
			return ErrPurchasePaymentConflict
		}

		var ba coreModels.BankAccount
		if err := tx.First(&ba, "id = ?", strings.TrimSpace(req.BankAccountID)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return errors.New("bank account not found")
			}
			return err
		}
		if !ba.IsActive {
			return ErrPurchasePaymentConflict
		}

		amount := math.Max(0, req.Amount)
		if amount <= 0 {
			return ErrPurchasePaymentConflict
		}

		p := &models.PurchasePayment{
			SupplierInvoiceID: inv.ID,
			BankAccountID:     ba.ID,
			PaymentDate:       strings.TrimSpace(req.PaymentDate),
			Amount:            amount,
			Method:            models.PurchasePaymentMethod(method),
			Status:            models.PurchasePaymentStatusPending,
			ReferenceNumber:   req.ReferenceNumber,
			Notes:             req.Notes,
			CreatedBy:         actorID,
		}
		snapshotPurchasePayment(p, &ba)
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

	uc.auditService.Log(ctx, "purchase_payment.create", out.ID, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *purchasePaymentUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchasePaymentNotFound
		}
		return err
	}
	if existing.Status != models.PurchasePaymentStatusPending {
		return ErrPurchasePaymentConflict
	}
	if err := uc.repo.Delete(ctx, id); err != nil {
		return err
	}
	uc.auditService.Log(ctx, "purchase_payment.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *purchasePaymentUsecase) Confirm(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error) {
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
		var pay models.PurchasePayment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pay, "id = ?", id).Error; err != nil {
			return err
		}
		if pay.Status != models.PurchasePaymentStatusPending {
			return ErrPurchasePaymentConflict
		}

		var inv models.SupplierInvoice
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, "id = ?", pay.SupplierInvoiceID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrSupplierInvoiceNotFound
			}
			return err
		}
		if inv.Status != models.SupplierInvoiceStatusUnpaid && inv.Status != models.SupplierInvoiceStatusPartial {
			return ErrPurchasePaymentConflict
		}

		// Sum already confirmed cash payments
		type sumRow struct{ Total float64 }
		var row sumRow
		if err := tx.Model(&models.PurchasePayment{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("supplier_invoice_id = ?", inv.ID).
			Where("status = ?", models.PurchasePaymentStatusConfirmed).
			Scan(&row).Error; err != nil {
			return err
		}

		// Total settled amount = Cash Payments + Down Payment
		totalSettled := row.Total + pay.Amount + inv.DownPaymentAmount
		if totalSettled > inv.Amount+0.0001 {
			return ErrPurchasePaymentConflict
		}

		if err := tx.Model(&pay).Updates(map[string]interface{}{"status": models.PurchasePaymentStatusConfirmed, "updated_at": apptime.Now()}).Error; err != nil {
			return err
		}

		newStatus := models.SupplierInvoiceStatusPartial
		if totalSettled >= inv.Amount-0.0001 {
			newStatus = models.SupplierInvoiceStatusPaid
		}

		updateData := map[string]interface{}{
			"status":           newStatus,
			"paid_amount":      row.Total + pay.Amount, // Track cash payments only (DP tracked separately in down_payment_amount)
			"remaining_amount": math.Max(0, inv.Amount-totalSettled),
			"updated_at":       apptime.Now(),
		}
		if newStatus == models.SupplierInvoiceStatusPaid {
			now := apptime.Now()
			updateData["payment_at"] = &now
		}

		if err := tx.Model(&inv).Updates(updateData).Error; err != nil {
			return err
		}

		// If regular invoice is fully paid and it has a PurchaseOrder, close the PO
		if newStatus == models.SupplierInvoiceStatusPaid && inv.Type == models.SupplierInvoiceTypeNormal && inv.PurchaseOrderID != "" {
			var po models.PurchaseOrder
			if err := tx.First(&po, "id = ?", inv.PurchaseOrderID).Error; err == nil {
				_ = tx.Model(&po).Update("status", "closed").Error
			}
		}

		// When a DP Invoice becomes paid, update existing Regular Invoices on the same PO
		if newStatus == models.SupplierInvoiceStatusPaid && inv.Type == models.SupplierInvoiceTypeDownPayment && inv.PurchaseOrderID != "" {
			// Sum all paid DP amounts for this PO
			type dpSumRow struct{ Total float64 }
			var dpSum dpSumRow
			if err := tx.Model(&models.SupplierInvoice{}).
				Select("COALESCE(SUM(paid_amount),0) as total").
				Where("purchase_order_id = ?", inv.PurchaseOrderID).
				Where("type = ?", models.SupplierInvoiceTypeDownPayment).
				Where("status = ?", models.SupplierInvoiceStatusPaid).
				Where("deleted_at IS NULL").
				Scan(&dpSum).Error; err != nil {
				return err
			}

			// Find all Regular Invoices on the same PO and update them
			var regularInvoices []models.SupplierInvoice
			if err := tx.Where("purchase_order_id = ?", inv.PurchaseOrderID).
				Where("type = ?", models.SupplierInvoiceTypeNormal).
				Where("deleted_at IS NULL").
				Find(&regularInvoices).Error; err != nil {
				return err
			}

			for _, regInv := range regularInvoices {
				// We keep regInv.Amount as Gross Amount
				// Calculate total deductions: PaidAmount (cash) + dpSum.Total (DP)
				totalDeductions := regInv.PaidAmount + dpSum.Total
				newRemaining := math.Max(0, regInv.Amount-totalDeductions)

				regStatus := models.SupplierInvoiceStatusUnpaid
				if newRemaining <= 0.0001 && regInv.Amount > 0 {
					regStatus = models.SupplierInvoiceStatusPaid
				} else if totalDeductions > 0 {
					regStatus = models.SupplierInvoiceStatusPartial
				}

				dpInvID := inv.ID
				regUpdates := map[string]interface{}{
					"status":                  regStatus,
					"down_payment_invoice_id": &dpInvID,
					"down_payment_amount":     dpSum.Total,
					"remaining_amount":        newRemaining,
					"updated_at":              apptime.Now(),
				}
				if regStatus == models.SupplierInvoiceStatusPaid && regInv.PaymentAt == nil {
					now := apptime.Now()
					regUpdates["payment_at"] = &now
				}

				if err := tx.Model(&models.SupplierInvoice{}).Where("id = ?", regInv.ID).Updates(regUpdates).Error; err != nil {
					return err
				}
				fmt.Printf("✅ Updated Regular Invoice %s: Status %s, DP deducted %.2f, remaining %.2f\n", regInv.Code, regStatus, dpSum.Total, newRemaining)
			}
		}

		confirmedID = pay.ID
		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrPurchasePaymentNotFound
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
		fmt.Printf("⚠️ Failed to create journal entry for purchase payment %s: %v\n", id, err)
	}

	uc.auditService.Log(ctx, "purchase_payment.confirm", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *purchasePaymentUsecase) triggerJournalEntry(ctx context.Context, pay *models.PurchasePayment) error {
	// Credit: Bank/Cash (From BankAccount.ChartOfAccountID)
	// Debit: AP (21000) for normal invoices
	//        OR Purchase Advances/DP (11900) for down payment invoices

	// Need to fetch BankAccount if not preloaded with COA ID
	var ba coreModels.BankAccount
	if pay.BankAccount != nil && pay.BankAccount.ChartOfAccountID != nil {
		ba = *pay.BankAccount
	} else {
		if err := uc.db.WithContext(ctx).First(&ba, "id = ?", pay.BankAccountID).Error; err != nil {
			return err
		}
	}

	var creditAccountID string
	if ba.ChartOfAccountID != nil {
		creditAccountID = *ba.ChartOfAccountID
	} else {
		// Fallback to cash account
		def, err := uc.coaUC.GetByCode(ctx, "11100")
		if err != nil {
			return errors.New("bank account has no linked COA and default cash account 11100 not found")
		}
		creditAccountID = def.ID
	}

	// Determine debit account based on invoice type
	var debitAccountCode string
	var description string
	if pay.SupplierInvoice != nil && pay.SupplierInvoice.Type == models.SupplierInvoiceTypeDownPayment {
		debitAccountCode = "11900" // Purchase Advances / Uang Muka Pembelian
		description = "Supplier Down Payment"
	} else {
		debitAccountCode = "21000" // Accounts Payable / Hutang Usaha
		description = "Supplier Payment"
	}

	debitAcct, err := uc.coaUC.GetByCode(ctx, debitAccountCode)
	if err != nil {
		return err
	}

	refNum := ""
	if pay.ReferenceNumber != nil {
		refNum = *pay.ReferenceNumber
	}

	lines := []finDto.JournalLineRequest{
		{
			ChartOfAccountID: debitAcct.ID,
			Debit:            pay.Amount,
			Credit:           0,
			Memo:             fmt.Sprintf("%s %s", description, refNum),
		},
		{
			ChartOfAccountID: creditAccountID,
			Debit:            0,
			Credit:           pay.Amount,
			Memo:             fmt.Sprintf("Outbound Payment %s", refNum),
		},
	}

	refID := pay.ID
	refType := "PURCHASE_PAYMENT"

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

func (uc *purchasePaymentUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchasePaymentAuditTrailEntry, int64, error) {
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
		Where("audit_logs.permission_code LIKE ?", "purchase_payment.%")

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

	entries := make([]dto.PurchasePaymentAuditTrailEntry, 0, len(rows))
	for _, r := range rows {
		metaMap := map[string]interface{}{}
		if strings.TrimSpace(r.Metadata) != "" {
			_ = json.Unmarshal([]byte(r.Metadata), &metaMap)
		}
		entries = append(entries, dto.PurchasePaymentAuditTrailEntry{
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

func (uc *purchasePaymentUsecase) ExportCSV(ctx context.Context, params repositories.PurchasePaymentListParams) ([]byte, error) {
	// export uses list params but ignores pagination (caller should cap limit)
	items, _, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}

	buf := &strings.Builder{}
	w := csv.NewWriter(buf)
	_ = w.Write([]string{"id", "invoice_code", "bank_account", "payment_date", "amount", "method", "status", "created_at"})

	for _, it := range items {
		invCode := ""
		if it.SupplierInvoice != nil {
			invCode = it.SupplierInvoice.Code
		}
		bankName := ""
		if it.BankAccount != nil {
			bankName = it.BankAccount.Name
		}
		_ = w.Write([]string{
			it.ID,
			invCode,
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
