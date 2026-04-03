package usecase

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/audit"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/finance/domain/accounting"
	"github.com/gilabs/gims/api/internal/finance/domain/reference"
	finUsecase "github.com/gilabs/gims/api/internal/finance/domain/usecase"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
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
	Reverse(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error)
	ReverseWithReason(ctx context.Context, id string, reason string) (*dto.PurchasePaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.PurchasePaymentAuditTrailEntry, int64, error)
	ExportCSV(ctx context.Context, params repositories.PurchasePaymentListParams) ([]byte, error)
	TriggerJournalForPayment(ctx context.Context, pay *models.PurchasePayment) error
}

type purchasePaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.PurchasePaymentRepository
	siRepo       repositories.SupplierInvoiceRepository
	auditService audit.AuditService
	mapper       *mapper.PurchasePaymentMapper
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
	engine       accounting.AccountingEngine
}

func NewPurchasePaymentUsecase(db *gorm.DB, repo repositories.PurchasePaymentRepository, siRepo repositories.SupplierInvoiceRepository, auditService audit.AuditService, journalUC finUsecase.JournalEntryUsecase, coaUC finUsecase.ChartOfAccountUsecase, engine accounting.AccountingEngine) PurchasePaymentUsecase {
	return &purchasePaymentUsecase{db: db, repo: repo, siRepo: siRepo, auditService: auditService, mapper: mapper.NewPurchasePaymentMapper(), journalUC: journalUC, coaUC: coaUC, engine: engine}
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
	if !security.CheckRecordScopeAccess(uc.db, ctx, &models.PurchasePayment{}, id, security.PurchaseScopeQueryOptions()) {
		return nil, ErrPurchasePaymentNotFound
	}

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

		// Prevent duplicate payment creation for the same invoice.
		var pendingCount int64
		if err := tx.Model(&models.PurchasePayment{}).
			Where("supplier_invoice_id = ? AND status = ?", inv.ID, models.PurchasePaymentStatusPending).
			Count(&pendingCount).Error; err != nil {
			return err
		}
		if pendingCount > 0 {
			return ErrPurchasePaymentConflict
		}

		if req.Amount > inv.RemainingAmount+0.0001 {
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

		if err := tx.Model(&inv).Updates(map[string]interface{}{
			"status":     models.SupplierInvoiceStatusWaitingPayment,
			"updated_at": apptime.Now(),
		}).Error; err != nil {
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

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
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

		type sumRow struct{ Total float64 }
		var row sumRow
		if err := tx.Model(&models.PurchasePayment{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("supplier_invoice_id = ?", inv.ID).
			Where("status = ?", models.PurchasePaymentStatusConfirmed).
			Scan(&row).Error; err != nil {
			return err
		}

		totalSettled := row.Total + inv.DownPaymentAmount
		restoredStatus := models.SupplierInvoiceStatusUnpaid
		if totalSettled > 0 {
			restoredStatus = models.SupplierInvoiceStatusPartial
		}
		if totalSettled >= inv.Amount-0.0001 {
			restoredStatus = models.SupplierInvoiceStatusPaid
		}

		updateData := map[string]interface{}{
			"status":           restoredStatus,
			"paid_amount":      row.Total,
			"remaining_amount": math.Max(0, inv.Amount-totalSettled),
			"updated_at":       apptime.Now(),
		}
		if restoredStatus == models.SupplierInvoiceStatusPaid {
			now := apptime.Now()
			updateData["payment_at"] = &now
		} else {
			updateData["payment_at"] = nil
		}

		if err := tx.Model(&inv).Updates(updateData).Error; err != nil {
			return err
		}

		if err := tx.Delete(&pay).Error; err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrPurchasePaymentNotFound
		}
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
		if inv.Status != models.SupplierInvoiceStatusUnpaid && inv.Status != models.SupplierInvoiceStatusPartial && inv.Status != models.SupplierInvoiceStatusWaitingPayment {
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

		// ✅ ATOMIC: Trigger journal INSIDE transaction — if journal fails, payment rolls back
		txCtx := database.WithTx(ctx, tx)
		loadedPay, loadErr := uc.repo.GetByID(txCtx, pay.ID)
		if loadErr != nil {
			return fmt.Errorf("failed to load payment for journal: %w", loadErr)
		}
		if err := uc.triggerJournalEntry(txCtx, loadedPay); err != nil {
			return fmt.Errorf("failed to create journal for purchase payment: %w", err)
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

	uc.auditService.Log(ctx, "purchase_payment.confirm", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *purchasePaymentUsecase) ReverseWithReason(ctx context.Context, id string, reason string) (*dto.PurchasePaymentDetailResponse, error) {
	return uc.reverse(ctx, id, reason)
}

func (uc *purchasePaymentUsecase) Reverse(ctx context.Context, id string) (*dto.PurchasePaymentDetailResponse, error) {
	return uc.reverse(ctx, id, "Manual reversal")
}

func (uc *purchasePaymentUsecase) reverse(ctx context.Context, id string, reason string) (*dto.PurchasePaymentDetailResponse, error) {
	var reversed *models.PurchasePayment
	err := uc.db.Transaction(func(tx *gorm.DB) error {
		pay, err := uc.repo.GetByID(database.WithTx(ctx, tx), id)
		if err != nil {
			return err
		}

		if pay.Status != models.PurchasePaymentStatusConfirmed {
			return fmt.Errorf("only confirmed payments can be reversed")
		}

		// Update payment status
		if err := tx.Model(pay).Update("status", models.PurchasePaymentStatusReversed).Error; err != nil {
			return err
		}

		// Update invoice
		var inv models.SupplierInvoice
		if err := tx.First(&inv, "id = ?", pay.SupplierInvoiceID).Error; err != nil {
			return err
		}

		// Recalculate invoice status
		type paySumRow struct{ Total float64 }
		var row paySumRow
		if err := tx.Model(&models.PurchasePayment{}).
			Select("COALESCE(SUM(amount),0) as total").
			Where("supplier_invoice_id = ?", inv.ID).
			Where("status = ?", models.PurchasePaymentStatusConfirmed).
			Where("deleted_at IS NULL").
			Scan(&row).Error; err != nil {
			return err
		}

		// DP total already tracked in inv.DownPaymentAmount
		totalSettled := row.Total + inv.DownPaymentAmount
		newRemaining := math.Max(0, inv.Amount-totalSettled)

		newStatus := models.SupplierInvoiceStatusUnpaid
		if newRemaining <= 0.0001 && inv.Amount > 0 {
			newStatus = models.SupplierInvoiceStatusPaid
		} else if totalSettled > 0 {
			newStatus = models.SupplierInvoiceStatusPartial
		}

		updateData := map[string]interface{}{
			"status":           newStatus,
			"paid_amount":      row.Total,
			"remaining_amount": newRemaining,
			"updated_at":       apptime.Now(),
		}
		if newStatus != models.SupplierInvoiceStatusPaid {
			updateData["payment_at"] = nil
		}

		if err := tx.Model(&inv).Updates(updateData).Error; err != nil {
			return err
		}

		// Trigger journal reversal
		if err := uc.triggerJournalReversed(database.WithTx(ctx, tx), pay, reason); err != nil {
			return fmt.Errorf("failed to reverse journal: %w", err)
		}

		reversed = pay
		return nil
	})

	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "purchase_payment.reverse", id, map[string]interface{}{
		"status": "REVERSED",
		"reason": reason,
	})

	return uc.mapper.ToDetailResponse(reversed), nil
}

func (uc *purchasePaymentUsecase) triggerJournalReversed(ctx context.Context, pay *models.PurchasePayment, reason string) error {
	if pay == nil || uc.journalUC == nil {
		return nil
	}

	refType := reference.RefTypePurchasePayment
	var existing financeModels.JournalEntry
	err := database.GetDB(ctx, uc.db).
		Where("reference_type = ? AND reference_id = ?", refType, pay.ID).
		Where("status = ?", financeModels.JournalStatusPosted).
		First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		return nil
	}
	if err != nil {
		return err
	}

	_, err = uc.journalUC.ReverseWithReason(ctx, existing.ID, reason)
	return err
}

func (uc *purchasePaymentUsecase) triggerJournalEntry(ctx context.Context, pay *models.PurchasePayment) error {
	if pay == nil || uc.journalUC == nil || uc.engine == nil {
		return nil
	}

	// Fetch BankAccount COA ID
	var baCOAID string
	if pay.BankAccount != nil && pay.BankAccount.ChartOfAccountID != nil {
		baCOAID = *pay.BankAccount.ChartOfAccountID
	} else {
		var ba coreModels.BankAccount
		if err := uc.db.WithContext(ctx).First(&ba, "id = ?", pay.BankAccountID).Error; err == nil && ba.ChartOfAccountID != nil {
			baCOAID = *ba.ChartOfAccountID
		}
	}

	// Default to cash if bank account has no COA
	if baCOAID == "" {
		def, err := uc.coaUC.GetByCode(ctx, "11100")
		if err == nil {
			baCOAID = def.ID
		}
	}

	reqRefNum := ""
	if pay.ReferenceNumber != nil {
		reqRefNum = *pay.ReferenceNumber
	}

	invoiceCode := ""
	isDP := false
	if pay.SupplierInvoice != nil {
		invoiceCode = pay.SupplierInvoice.Code
		isDP = (pay.SupplierInvoice.Type == models.SupplierInvoiceTypeDownPayment)
	}

	profile := accounting.ProfilePurchasePayment
	if isDP {
		profile = accounting.ProfilePurchasePaymentDP
	}

	data := accounting.TransactionData{
		ReferenceType:    "PURCHASE_PAYMENT",
		ReferenceID:      pay.ID,
		EntryDate:        pay.PaymentDate,
		Description:      fmt.Sprintf("Supplier Payment %s (Ref: %s)", invoiceCode, reqRefNum),
		TotalAmount:      pay.Amount,
		BankAccountCOAID: baCOAID,
		DescriptionArgs:  []interface{}{invoiceCode, reqRefNum},
	}

	req, err := uc.engine.GenerateJournal(ctx, profile, data)
	if err != nil {
		return fmt.Errorf("failed to generate purchase payment journal: %w", err)
	}

	// Balance check
	var debitTotal, creditTotal float64
	for _, l := range req.Lines {
		debitTotal += l.Debit
		creditTotal += l.Credit
	}
	if math.Abs(debitTotal-creditTotal) > 0.001 {
		return fmt.Errorf("generated purchase payment journal is unbalanced: debit=%.2f credit=%.2f", debitTotal, creditTotal)
	}

	req.IsSystemGenerated = true
	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to post purchase payment journal: %w", err)
	}

	log.Printf("journal_observability event=trigger.success module=purchase_payment reference_id=%s", pay.ID)
	return nil
}

func (uc *purchasePaymentUsecase) TriggerJournalForPayment(ctx context.Context, pay *models.PurchasePayment) error {
	return uc.triggerJournalEntry(ctx, pay)
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
	refCache := make(map[string]string)
	for _, r := range rows {
		metaMap := parsePurchaseAuditMetadata(ctx, uc.db, r.Metadata, refCache)

		var usr *dto.AuditTrailUser
		if r.ActorID != "" {
			email := ""
			name := ""
			if r.ActorEmail != nil {
				email = *r.ActorEmail
			}
			if r.ActorName != nil {
				name = *r.ActorName
			}
			usr = &dto.AuditTrailUser{ID: r.ActorID, Email: email, Name: name}
		}

		entries = append(entries, dto.PurchasePaymentAuditTrailEntry{
			ID:             r.ID,
			PermissionCode: r.PermissionCode,
			Action:         r.Action,
			TargetID:       r.TargetID,
			Metadata:       metaMap,
			User:           usr,
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
