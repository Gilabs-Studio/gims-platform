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
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
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

		if err := ensureNoExistingSalesPayment(tx, inv.ID); err != nil {
			return err
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

	return "", ErrSalesPaymentConflict
}

func lockInvoiceForSalesPaymentCreate(tx *gorm.DB, invoiceID string) (*models.CustomerInvoice, error) {
	var inv models.CustomerInvoice
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inv, salesPaymentQueryByID, invoiceID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New(errSalesPaymentInvNotFound)
		}
		return nil, err
	}

	if inv.Status != models.CustomerInvoiceStatusUnpaid && inv.Status != models.CustomerInvoiceStatusPartial {
		return nil, ErrSalesPaymentConflict
	}

	return &inv, nil
}

func ensureNoExistingSalesPayment(tx *gorm.DB, invoiceID string) error {
	var existingPaymentCount int64
	if err := tx.Model(&models.SalesPayment{}).
		Where(salesPaymentByInvoiceQuery, invoiceID).
		Count(&existingPaymentCount).Error; err != nil {
		return err
	}

	if existingPaymentCount > 0 {
		return ErrSalesPaymentConflict
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
		return nil, ErrSalesPaymentConflict
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
		return nil, ErrSalesPaymentConflict
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

	// Trigger journal entry for this payment
	if err := uc.triggerJournalEntry(ctx, out); err != nil {
		// Log error but don't fail the confirm
		fmt.Printf("⚠️ Failed to create journal entry for sales payment %s: %v\n", id, err)
	}

	uc.auditService.Log(ctx, "sales_payment.confirm", id, map[string]interface{}{"after": out})
	return uc.mapper.ToDetailResponse(out), nil
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
	if status == models.CustomerInvoiceStatusUnpaid || status == models.CustomerInvoiceStatusPartial || status == models.CustomerInvoiceStatusWaitingPayment {
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
	traceKey := refType + ":" + refID
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	req := &finDto.CreateJournalEntryRequest{
		EntryDate:     pay.PaymentDate,
		Description:   fmt.Sprintf("%s %s", description, refNum),
		ReferenceID:   &refID,
		ReferenceType: &refType,
		Lines:         lines,
	}

	log.Printf("journal_observability event=trigger.start fields=%+v", map[string]interface{}{
		"trace_key":      traceKey,
		"module":         "sales_payment",
		"reference_type": refType,
		"reference_id":   refID,
		"line_count":     len(lines),
		"actor_id":       actorID,
	})

	_, err = uc.journalUC.PostOrUpdateJournal(ctx, req)
	if err != nil {
		log.Printf("journal_observability event=trigger.failed fields=%+v", map[string]interface{}{
			"trace_key": traceKey,
			"module":    "sales_payment",
			"error":     err.Error(),
		})
		return err
	}

	log.Printf("journal_observability event=trigger.success fields=%+v", map[string]interface{}{
		"trace_key": traceKey,
		"module":    "sales_payment",
	})

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
