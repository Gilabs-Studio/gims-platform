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

const (
	errSalesPaymentDBNil       = "db is nil"
	errSalesPaymentInvNotFound = "customer invoice not found"
	salesPaymentQueryByID      = "id = ?"
	salesPaymentByInvoiceQuery = "customer_invoice_id = ?"
	salesPaymentStatusQuery    = "status = ?"
	salesPaymentDisplayDateFmt = "2006-01-02"
)

type SalesPaymentUsecase interface {
	AddData(ctx context.Context) (*dto.SalesPaymentAddResponse, error)
	List(ctx context.Context, params repositories.SalesPaymentListParams) ([]*dto.SalesPaymentListResponse, int64, error)
	GetByID(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateSalesPaymentRequest) (*dto.SalesPaymentDetailResponse, error)
	Delete(ctx context.Context, id string) error
	Confirm(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error)
	Reverse(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error)
	ReverseWithReason(ctx context.Context, id string, reason string) (*dto.SalesPaymentDetailResponse, error)
	ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesPaymentAuditTrailEntry, int64, error)
	ExportCSV(ctx context.Context, params repositories.SalesPaymentListParams) ([]byte, error)
	TriggerJournalForPayment(ctx context.Context, pay *models.SalesPayment) error
}

type salesPaymentUsecase struct {
	db           *gorm.DB
	repo         repositories.SalesPaymentRepository
	auditService audit.AuditService
	mapper       *mapper.SalesPaymentMapper
	journalUC    finUsecase.JournalEntryUsecase
	coaUC        finUsecase.ChartOfAccountUsecase
	engine       accounting.AccountingEngine
}

func NewSalesPaymentUsecase(
	db *gorm.DB,
	repo repositories.SalesPaymentRepository,
	auditService audit.AuditService,
	journalUC finUsecase.JournalEntryUsecase,
	coaUC finUsecase.ChartOfAccountUsecase,
	engine accounting.AccountingEngine,
) SalesPaymentUsecase {
	return &salesPaymentUsecase{
		db:           db,
		repo:         repo,
		auditService: auditService,
		mapper:       mapper.NewSalesPaymentMapper(),
		journalUC:    journalUC,
		coaUC:        coaUC,
		engine:       engine,
	}
}

func (uc *salesPaymentUsecase) AddData(ctx context.Context) (*dto.SalesPaymentAddResponse, error) {
	if uc.db == nil {
		return nil, errors.New(errSalesPaymentDBNil)
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
			models.CustomerInvoiceStatusApproved,
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
			dd := inv.DueDate.Format(salesPaymentDisplayDateFmt)
			dueDate = &dd
		}

		invItems = append(invItems, &dto.SalesPaymentAddInvoiceItem{
			ID:              inv.ID,
			SalesOrder:      soObj,
			Code:            inv.Code,
			InvoiceNumber:   inv.InvoiceNumber,
			Type:            string(inv.Type),
			InvoiceDate:     inv.InvoiceDate.Format(salesPaymentDisplayDateFmt),
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
	if !security.CheckRecordScopeAccess(uc.db, ctx, &models.SalesPayment{}, id, security.SalesScopeQueryOptions()) {
		return nil, ErrSalesPaymentNotFound
	}
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

	actorID := getContextUserID(ctx)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}
	if uc.db == nil {
		return nil, errors.New(errSalesPaymentDBNil)
	}

	method, err := normalizeSalesPaymentMethod(req.Method)
	if err != nil {
		return nil, ErrSalesPaymentConflict
	}

	createdID, err := uc.createSalesPaymentTx(ctx, req, actorID, method)
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

func (uc *salesPaymentUsecase) createSalesPaymentTx(
	ctx context.Context,
	req *dto.CreateSalesPaymentRequest,
	actorID string,
	method models.SalesPaymentMethod,
) (string, error) {
	createdID := ""
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		inv, err := lockInvoiceForSalesPaymentCreate(tx, strings.TrimSpace(req.InvoiceID))
		if err != nil {
			return err
		}

		if err := ensureNoPendingSalesPayment(tx, inv.ID); err != nil {
			return err
		}

		if req.Amount > inv.RemainingAmount+0.0001 {
			log.Printf("sales_payment_conflict: amount %.2f exceeds remaining %.2f for invoice %s", req.Amount, inv.RemainingAmount, inv.ID)
			return fmt.Errorf("payment amount %.2f exceeds remaining amount %.2f", req.Amount, inv.RemainingAmount)
		}

		ba, err := lockActiveBankAccount(tx, strings.TrimSpace(req.BankAccountID))
		if err != nil {
			return err
		}

		payment, err := buildPendingSalesPayment(req, inv.ID, ba, actorID, method)
		if err != nil {
			return err
		}

		if err := tx.Create(payment).Error; err != nil {
			return err
		}

		if err := markInvoiceWaitingPayment(tx, inv); err != nil {
			return err
		}

		createdID = payment.ID
		return nil
	})

	return createdID, err
}

func getContextUserID(ctx context.Context) string {
	actorID, _ := ctx.Value("user_id").(string)
	return strings.TrimSpace(actorID)
}

func normalizeSalesPaymentMethod(raw string) (models.SalesPaymentMethod, error) {
	method := models.SalesPaymentMethod(strings.ToUpper(strings.TrimSpace(raw)))
	if method == models.SalesPaymentMethodBank || method == models.SalesPaymentMethodCash {
		return method, nil
	}

	log.Printf("sales_payment_conflict: invalid method %s", raw)
	return "", fmt.Errorf("invalid payment method: %s", raw)
}

func lockInvoiceForSalesPaymentCreate(tx *gorm.DB, invoiceID string) (*models.CustomerInvoice, error) {
	var inv models.CustomerInvoice
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, salesPaymentQueryByID, invoiceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errSalesPaymentInvNotFound)
		}
		return nil, err
	}

	if inv.Status != models.CustomerInvoiceStatusUnpaid && inv.Status != models.CustomerInvoiceStatusPartial && inv.Status != models.CustomerInvoiceStatusApproved {
		log.Printf("sales_payment_conflict: invalid invoice status %s for invoice %s", inv.Status, inv.ID)
		return nil, fmt.Errorf("invoice status is %s (only APPROVED/UNPAID/PARTIAL allowed)", inv.Status)
	}

	return &inv, nil
}

func ensureNoPendingSalesPayment(tx *gorm.DB, invoiceID string) error {
	var pendingCount int64
	if err := tx.Model(&models.SalesPayment{}).
		Where("customer_invoice_id = ? AND status = ?", invoiceID, models.SalesPaymentStatusPending).
		Count(&pendingCount).Error; err != nil {
		return err
	}

	if pendingCount > 0 {
		log.Printf("sales_payment_conflict: another payment is already pending for invoice %s", invoiceID)
		return fmt.Errorf("another payment is already pending for this invoice")
	}

	return nil
}

func lockActiveBankAccount(tx *gorm.DB, bankAccountID string) (*coreModels.BankAccount, error) {
	var ba coreModels.BankAccount
	if err := tx.First(&ba, salesPaymentQueryByID, bankAccountID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("bank account not found")
		}
		return nil, err
	}

	if !ba.IsActive {
		log.Printf("sales_payment_conflict: bank account %s is inactive", ba.ID)
		return nil, fmt.Errorf("bank account %s is inactive", ba.ID)
	}

	return &ba, nil
}

func buildPendingSalesPayment(
	req *dto.CreateSalesPaymentRequest,
	invoiceID string,
	bankAccount *coreModels.BankAccount,
	actorID string,
	method models.SalesPaymentMethod,
) (*models.SalesPayment, error) {
	amount := math.Max(0, req.Amount)
	if amount <= 0 {
		log.Printf("sales_payment_conflict: invalid amount %.2f", req.Amount)
		return nil, fmt.Errorf("payment amount must be greater than zero (received: %.2f)", req.Amount)
	}

	return &models.SalesPayment{
		CustomerInvoiceID:           invoiceID,
		BankAccountID:               bankAccount.ID,
		PaymentDate:                 strings.TrimSpace(req.PaymentDate),
		Amount:                      amount,
		Method:                      method,
		Status:                      models.SalesPaymentStatusPending,
		ReferenceNumber:             req.ReferenceNumber,
		Notes:                       req.Notes,
		CreatedBy:                   actorID,
		BankAccountNameSnapshot:     strings.TrimSpace(bankAccount.Name),
		BankAccountNumberSnapshot:   strings.TrimSpace(bankAccount.AccountNumber),
		BankAccountHolderSnapshot:   strings.TrimSpace(bankAccount.AccountHolder),
		BankAccountCurrencySnapshot: strings.TrimSpace(bankAccount.Currency),
	}, nil
}

func markInvoiceWaitingPayment(tx *gorm.DB, inv *models.CustomerInvoice) error {
	return tx.Model(inv).Updates(map[string]interface{}{
		"status":     models.CustomerInvoiceStatusWaitingPayment,
		"updated_at": apptime.Now(),
	}).Error
}

func (uc *salesPaymentUsecase) Delete(ctx context.Context, id string) error {
	existing, err := uc.repo.GetByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSalesPaymentNotFound
		}
		return err
	}
	if uc.db == nil {
		return errors.New(errSalesPaymentDBNil)
	}

	err = uc.deleteSalesPaymentTx(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrSalesPaymentNotFound
		}
		return err
	}

	uc.auditService.Log(ctx, "sales_payment.delete", id, map[string]interface{}{"before": existing})
	return nil
}

func (uc *salesPaymentUsecase) deleteSalesPaymentTx(ctx context.Context, id string) error {
	return uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		payment, err := lockPendingSalesPayment(tx, id)
		if err != nil {
			return err
		}

		invoice, err := lockInvoiceForSalesPayment(tx, payment.CustomerInvoiceID)
		if err != nil {
			return err
		}

		confirmedTotal, err := sumConfirmedSalesPayments(tx, invoice.ID)
		if err != nil {
			return err
		}

		status := deriveInvoiceStatusFromPaidTotal(invoice.Amount, confirmedTotal)
		if err := tx.Model(invoice).Updates(buildInvoicePaymentAggregateUpdate(invoice.Amount, confirmedTotal, status)).Error; err != nil {
			return err
		}

		return tx.Delete(payment).Error
	})
}

func lockPendingSalesPayment(tx *gorm.DB, paymentID string) (*models.SalesPayment, error) {
	var pay models.SalesPayment
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&pay, salesPaymentQueryByID, paymentID).Error; err != nil {
		return nil, err
	}
	if pay.Status != models.SalesPaymentStatusPending {
		return nil, ErrSalesPaymentConflict
	}

	return &pay, nil
}

func lockInvoiceForSalesPayment(tx *gorm.DB, invoiceID string) (*models.CustomerInvoice, error) {
	var inv models.CustomerInvoice
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, salesPaymentQueryByID, invoiceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errSalesPaymentInvNotFound)
		}
		return nil, err
	}

	return &inv, nil
}

func sumConfirmedSalesPayments(tx *gorm.DB, invoiceID string) (float64, error) {
	type sumRow struct{ Total float64 }
	var row sumRow
	if err := tx.Model(&models.SalesPayment{}).
		Select("COALESCE(SUM(amount),0) as total").
		Where(salesPaymentByInvoiceQuery, invoiceID).
		Where(salesPaymentStatusQuery, models.SalesPaymentStatusConfirmed).
		Scan(&row).Error; err != nil {
		return 0, err
	}

	return row.Total, nil
}

func deriveInvoiceStatusFromPaidTotal(invoiceAmount, paidTotal float64) models.CustomerInvoiceStatus {
	if paidTotal >= invoiceAmount-0.0001 {
		return models.CustomerInvoiceStatusPaid
	}
	if paidTotal > 0 {
		return models.CustomerInvoiceStatusPartial
	}

	return models.CustomerInvoiceStatusUnpaid
}

func buildInvoicePaymentAggregateUpdate(
	invoiceAmount float64,
	paidTotal float64,
	status models.CustomerInvoiceStatus,
) map[string]interface{} {
	updateData := map[string]interface{}{
		"status":           status,
		"paid_amount":      paidTotal,
		"remaining_amount": math.Max(0, invoiceAmount-paidTotal),
		"updated_at":       apptime.Now(),
		"payment_at":       nil,
	}

	if status == models.CustomerInvoiceStatusPaid {
		now := apptime.Now()
		updateData["payment_at"] = &now
	}

	return updateData
}

func (uc *salesPaymentUsecase) Confirm(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error) {
	actorID := getContextUserID(ctx)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}
	if uc.db == nil {
		return nil, errors.New(errSalesPaymentDBNil)
	}

	confirmedID, err := uc.confirmSalesPaymentTx(ctx, id)
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

	uc.auditService.Log(ctx, "sales_payment.confirm", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
}

func (uc *salesPaymentUsecase) ReverseWithReason(ctx context.Context, id string, reason string) (*dto.SalesPaymentDetailResponse, error) {
	return uc.reverse(ctx, id, reason)
}

func (uc *salesPaymentUsecase) Reverse(ctx context.Context, id string) (*dto.SalesPaymentDetailResponse, error) {
	return uc.reverse(ctx, id, "Manual reversal")
}

func (uc *salesPaymentUsecase) reverse(ctx context.Context, id string, reason string) (*dto.SalesPaymentDetailResponse, error) {
	var reversed *models.SalesPayment
	err := uc.db.Transaction(func(tx *gorm.DB) error {
		payment, err := uc.repo.GetByID(database.WithTx(ctx, tx), id)
		if err != nil {
			return err
		}

		if payment.Status != models.SalesPaymentStatusConfirmed {
			return fmt.Errorf("only confirmed payments can be reversed")
		}

		// Update status
		if err := tx.Model(payment).Update("status", models.SalesPaymentStatusReversed).Error; err != nil {
			return err
		}

		// Update invoice
		invoice, err := lockInvoiceForSalesPayment(tx, payment.CustomerInvoiceID)
		if err != nil {
			return err
		}

		confirmedTotal, err := sumConfirmedSalesPayments(tx, invoice.ID)
		if err != nil {
			return err
		}

		newStatus := deriveInvoiceStatusFromPaidTotal(invoice.Amount, confirmedTotal)
		if err := tx.Model(invoice).Updates(buildInvoicePaymentAggregateUpdate(invoice.Amount, confirmedTotal, newStatus)).Error; err != nil {
			return err
		}

		// Trigger journal reversal
		if err := uc.triggerJournalReversed(database.WithTx(ctx, tx), payment, reason); err != nil {
			return fmt.Errorf("failed to reverse journal: %w", err)
		}

		reversed = payment
		return nil
	})

	if err != nil {
		return nil, err
	}

	uc.auditService.Log(ctx, "sales_payment.reverse", id, map[string]interface{}{
		"status": "REVERSED",
		"reason": reason,
	})

	return uc.mapper.ToDetailResponse(reversed), nil
}

func (uc *salesPaymentUsecase) confirmSalesPaymentTx(ctx context.Context, paymentID string) (string, error) {
	confirmedID := ""
	err := uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		payment, invoice, confirmedTotal, err := uc.prepareConfirmSalesPayment(tx, paymentID)
		if err != nil {
			return err
		}

		if err := ensurePaymentWithinInvoiceLimit(confirmedTotal, payment.Amount, invoice.Amount); err != nil {
			return err
		}

		if err := markSalesPaymentConfirmed(tx, payment); err != nil {
			return err
		}

		newTotal := confirmedTotal + payment.Amount
		newStatus := deriveInvoiceStatusFromPaidTotal(invoice.Amount, newTotal)
		if err := tx.Model(invoice).Updates(buildInvoicePaymentAggregateUpdate(invoice.Amount, newTotal, newStatus)).Error; err != nil {
			return err
		}

		closeRelatedSalesOrderIfPaid(tx, invoice, newStatus)
		if err := uc.applyDownPaymentRecalculationIfNeeded(tx, invoice, newStatus); err != nil {
			return err
		}

		// ✅ ATOMIC: Trigger journal INSIDE transaction — if journal fails, payment rolls back
		txCtx := database.WithTx(ctx, tx)
		loadedPay, loadErr := uc.repo.GetByID(txCtx, payment.ID)
		if loadErr != nil {
			return fmt.Errorf("failed to load payment for journal: %w", loadErr)
		}
		if err := uc.triggerJournalEntry(txCtx, loadedPay); err != nil {
			return fmt.Errorf("failed to create journal for sales payment: %w", err)
		}

		confirmedID = payment.ID
		return nil
	})

	return confirmedID, err
}

func (uc *salesPaymentUsecase) prepareConfirmSalesPayment(
	tx *gorm.DB,
	paymentID string,
) (*models.SalesPayment, *models.CustomerInvoice, float64, error) {
	payment, err := lockPendingSalesPayment(tx, paymentID)
	if err != nil {
		return nil, nil, 0, err
	}

	invoice, err := lockInvoiceForSalesPayment(tx, payment.CustomerInvoiceID)
	if err != nil {
		return nil, nil, 0, err
	}

	if err := validateInvoiceStatusForConfirm(invoice.Status); err != nil {
		return nil, nil, 0, err
	}

	confirmedTotal, err := sumConfirmedSalesPayments(tx, invoice.ID)
	if err != nil {
		return nil, nil, 0, err
	}

	return payment, invoice, confirmedTotal, nil
}

func validateInvoiceStatusForConfirm(status models.CustomerInvoiceStatus) error {
	if status == models.CustomerInvoiceStatusApproved || status == models.CustomerInvoiceStatusUnpaid || status == models.CustomerInvoiceStatusPartial || status == models.CustomerInvoiceStatusWaitingPayment {
		return nil
	}

	return ErrSalesPaymentConflict
}

func ensurePaymentWithinInvoiceLimit(confirmedTotal, paymentAmount, invoiceAmount float64) error {
	if confirmedTotal+paymentAmount <= invoiceAmount+0.0001 {
		return nil
	}

	return ErrSalesPaymentConflict
}

func markSalesPaymentConfirmed(tx *gorm.DB, payment *models.SalesPayment) error {
	return tx.Model(payment).Updates(map[string]interface{}{
		"status":     models.SalesPaymentStatusConfirmed,
		"updated_at": apptime.Now(),
	}).Error
}

func closeRelatedSalesOrderIfPaid(tx *gorm.DB, invoice *models.CustomerInvoice, status models.CustomerInvoiceStatus) {
	if status != models.CustomerInvoiceStatusPaid || invoice.Type != models.CustomerInvoiceTypeRegular || invoice.SalesOrderID == nil {
		return
	}

	var so models.SalesOrder
	if err := tx.First(&so, salesPaymentQueryByID, *invoice.SalesOrderID).Error; err == nil {
		_ = tx.Model(&so).Update("status", "closed").Error
	}
}

func (uc *salesPaymentUsecase) applyDownPaymentRecalculationIfNeeded(
	tx *gorm.DB,
	invoice *models.CustomerInvoice,
	status models.CustomerInvoiceStatus,
) error {
	if status != models.CustomerInvoiceStatusPaid || invoice.Type != models.CustomerInvoiceTypeDownPayment || invoice.SalesOrderID == nil {
		return nil
	}

	totalPaidDownPayment, err := sumPaidDownPaymentBySalesOrder(tx, *invoice.SalesOrderID)
	if err != nil {
		return err
	}

	var regularInvoices []models.CustomerInvoice
	if err := tx.Where("sales_order_id = ?", *invoice.SalesOrderID).
		Where("type = ?", models.CustomerInvoiceTypeRegular).
		Where("deleted_at IS NULL").
		Find(&regularInvoices).Error; err != nil {
		return err
	}

	for _, regInv := range regularInvoices {
		originalAmount := regInv.Subtotal + regInv.TaxAmount + regInv.DeliveryCost + regInv.OtherCost
		newAmount := math.Max(0, originalAmount-totalPaidDownPayment)
		newRemaining := math.Max(0, newAmount-regInv.PaidAmount)
		dpInvoiceID := invoice.ID

		if err := tx.Model(&models.CustomerInvoice{}).
			Where(salesPaymentQueryByID, regInv.ID).
			Updates(map[string]interface{}{
				"down_payment_invoice_id": &dpInvoiceID,
				"down_payment_amount":     totalPaidDownPayment,
				"amount":                  newAmount,
				"remaining_amount":        newRemaining,
				"updated_at":              apptime.Now(),
			}).Error; err != nil {
			return err
		}

		fmt.Printf("✅ Updated Regular Invoice %s: DP deducted %.2f, new amount %.2f\n", regInv.Code, totalPaidDownPayment, newAmount)
	}

	return nil
}

func sumPaidDownPaymentBySalesOrder(tx *gorm.DB, salesOrderID string) (float64, error) {
	type dpSumRow struct{ Total float64 }
	var row dpSumRow
	if err := tx.Model(&models.CustomerInvoice{}).
		Select("COALESCE(SUM(paid_amount),0) as total").
		Where("sales_order_id = ?", salesOrderID).
		Where("type = ?", models.CustomerInvoiceTypeDownPayment).
		Where(salesPaymentStatusQuery, models.CustomerInvoiceStatusPaid).
		Where("deleted_at IS NULL").
		Scan(&row).Error; err != nil {
		return 0, err
	}

	return row.Total, nil
}

func (uc *salesPaymentUsecase) triggerJournalReversed(ctx context.Context, pay *models.SalesPayment, reason string) error {
	if pay == nil || uc.journalUC == nil {
		return nil
	}

	refType := reference.RefTypeSalesPayment
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

func (uc *salesPaymentUsecase) triggerJournalEntry(ctx context.Context, pay *models.SalesPayment) error {
	if pay == nil || uc.journalUC == nil || uc.engine == nil {
		return nil
	}

	// Resolve Bank Account COA for the DEBIT side
	var ba coreModels.BankAccount
	if pay.BankAccount != nil && pay.BankAccount.ChartOfAccountID != nil {
		ba = *pay.BankAccount
	} else {
		if err := database.GetDB(ctx, uc.db).First(&ba, "id = ?", pay.BankAccountID).Error; err != nil {
			return fmt.Errorf("bank account not found for payment: %w", err)
		}
	}

	var transactionCOAID string
	if ba.ChartOfAccountID != nil {
		transactionCOAID = *ba.ChartOfAccountID
	} else {
		// Fallback to default cash (11100)
		def, err := uc.coaUC.GetByCode(ctx, "11100")
		if err != nil {
			return errors.New("bank account has no linked COA and default cash account 11100 not found")
		}
		transactionCOAID = def.ID
	}

	// Choose profile based on invoice type
	profile := accounting.ProfileSalesPayment
	descPrefix := "Customer Payment"
	if pay.CustomerInvoice != nil && pay.CustomerInvoice.Type == models.CustomerInvoiceTypeDownPayment {
		profile = accounting.ProfileSalesPaymentDP
		descPrefix = "Customer Down Payment"
	}

	refNum := ""
	if pay.ReferenceNumber != nil {
		refNum = *pay.ReferenceNumber
	}

	data := accounting.TransactionData{
		ReferenceType:    reference.RefTypeSalesPayment,
		ReferenceID:      pay.ID,
		EntryDate:        pay.PaymentDate,
		Description:      fmt.Sprintf("%s %s", descPrefix, refNum),
		TotalAmount:      pay.Amount,
		TransactionCOAID: transactionCOAID,
		DescriptionArgs:  []interface{}{refNum, pay.BankAccountNameSnapshot},
	}

	req, err := uc.engine.GenerateJournal(ctx, profile, data)
	if err != nil {
		return fmt.Errorf("failed to generate sales payment journal: %w", err)
	}

	// Double-check balance
	var debitTotal, creditTotal float64
	for _, l := range req.Lines {
		debitTotal += l.Debit
		creditTotal += l.Credit
	}
	if math.Abs(debitTotal-creditTotal) > 0.001 {
		return fmt.Errorf("generated sales payment journal is unbalanced: debit=%.2f credit=%.2f", debitTotal, creditTotal)
	}

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	if err != nil {
		return fmt.Errorf("failed to post sales payment journal: %w", err)
	}

	log.Printf("journal_observability event=trigger.success reference_type=%s reference_id=%s", reference.RefTypeSalesPayment, pay.ID)
	return nil
}

func (uc *salesPaymentUsecase) TriggerJournalForPayment(ctx context.Context, pay *models.SalesPayment) error {
	return uc.triggerJournalEntry(ctx, pay)
}

func (uc *salesPaymentUsecase) ListAuditTrail(ctx context.Context, id string, page, perPage int) ([]dto.SalesPaymentAuditTrailEntry, int64, error) {
	if uc.db == nil {
		return nil, 0, errors.New(errSalesPaymentDBNil)
	}

	entries, total, err := listAuditTrailEntries(ctx, uc.db, id, "sales_payment.", page, perPage)
	if err != nil {
		return nil, 0, err
	}

	mapped := make([]dto.SalesPaymentAuditTrailEntry, 0, len(entries))
	for _, entry := range entries {
		mapped = append(mapped, dto.SalesPaymentAuditTrailEntry{
			ID:             entry.ID,
			Action:         entry.Action,
			PermissionCode: entry.PermissionCode,
			TargetID:       entry.TargetID,
			Metadata:       entry.Metadata,
			User:           entry.User,
			CreatedAt:      entry.CreatedAt,
		})
	}

	return mapped, total, nil
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
