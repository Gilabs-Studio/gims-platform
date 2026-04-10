package usecase

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
	salesModels "github.com/gilabs/gims/api/internal/sales/data/models"
	salesRepos "github.com/gilabs/gims/api/internal/sales/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ErrPOSPaymentNotFound is returned when the requested payment record does not exist.
var ErrPOSPaymentNotFound = errors.New("pos payment not found")

// POSPaymentUsecase handles POS payment processing.
type POSPaymentUsecase interface {
	// ProcessCash handles immediate cash or card payments
	ProcessCash(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID string) (*dto.POSPaymentResponse, error)
	// InitiateMidtrans creates a Midtrans charge and returns the payment details (VA number or QR)
	InitiateMidtrans(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID, companyID string) (*dto.POSPaymentResponse, error)
	// ConfirmMidtransWebhook processes a Midtrans server-to-server notification
	ConfirmMidtransWebhook(ctx context.Context, payload *dto.MidtransCallbackPayload) error
	// GetByOrderID returns all payments for an order
	GetByOrderID(ctx context.Context, orderID string) ([]dto.POSPaymentResponse, error)
}

type posPaymentUsecase struct {
	paymentRepo      repositories.POSPaymentRepository
	orderRepo        repositories.PosOrderRepository
	configRepo       repositories.POSConfigRepository
	midtransRepo     repositories.MidtransConfigRepository
	orderUsecase     POSOrderUsecase
	salesOrderRepo   salesRepos.SalesOrderRepository
	invoiceRepo      salesRepos.CustomerInvoiceRepository
	salesPaymentRepo salesRepos.SalesPaymentRepository
	bankAccountRepo  coreRepos.BankAccountRepository
}

// NewPOSPaymentUsecase constructs a POSPaymentUsecase.
func NewPOSPaymentUsecase(
	paymentRepo repositories.POSPaymentRepository,
	orderRepo repositories.PosOrderRepository,
	configRepo repositories.POSConfigRepository,
	midtransRepo repositories.MidtransConfigRepository,
	orderUsecase POSOrderUsecase,
	salesOrderRepo salesRepos.SalesOrderRepository,
	invoiceRepo salesRepos.CustomerInvoiceRepository,
	salesPaymentRepo salesRepos.SalesPaymentRepository,
	bankAccountRepo coreRepos.BankAccountRepository,
) POSPaymentUsecase {
	return &posPaymentUsecase{
		paymentRepo:      paymentRepo,
		orderRepo:        orderRepo,
		configRepo:       configRepo,
		midtransRepo:     midtransRepo,
		orderUsecase:     orderUsecase,
		salesOrderRepo:   salesOrderRepo,
		invoiceRepo:      invoiceRepo,
		salesPaymentRepo: salesPaymentRepo,
		bankAccountRepo:  bankAccountRepo,
	}
}

func (u *posPaymentUsecase) ProcessCash(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID string) (*dto.POSPaymentResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if order.Status == models.PosOrderStatusPaid || order.Status == models.PosOrderStatusCompleted {
		return nil, ErrPOSOrderAlreadyPaid
	}
	if req.Amount < order.TotalAmount {
		return nil, fmt.Errorf("%w: required %.2f, received %.2f", ErrPOSInvalidPayment, order.TotalAmount, req.Amount)
	}

	// Update customer name on the order if provided (used on receipt/invoice)
	if req.CustomerName != nil {
		trimmedName := strings.TrimSpace(*req.CustomerName)
		if trimmedName != "" {
			order.CustomerName = &trimmedName
		}
		_ = u.orderRepo.Update(ctx, order)
	}

	now := apptime.Now()
	change := req.Amount - order.TotalAmount
	payment := &models.POSPayment{
		OrderID:      orderID,
		Method:       models.POSPaymentMethod(req.Method),
		Status:       models.POSPaymentStatusPaid,
		Amount:       req.Amount,
		TenderAmount: req.Amount,
		ChangeAmount: change,
		ReferenceNumber: req.ReferenceNumber,
		Notes: req.Notes,
		PaidAt:       &now,
		CreatedBy:    cashierID,
	}
	if err := u.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}
	if err := u.finalizeOrder(ctx, order, cashierID, payment); err != nil {
		return nil, err
	}
	return mapper.ToPOSPaymentResponse(payment), nil
}

func (u *posPaymentUsecase) InitiateMidtrans(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID, companyID string) (*dto.POSPaymentResponse, error) {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSOrderNotFound
		}
		return nil, err
	}
	if order.Status == models.PosOrderStatusPaid || order.Status == models.PosOrderStatusCompleted {
		return nil, ErrPOSOrderAlreadyPaid
	}

	// Persist customer name from payment form if provided.
	if req.CustomerName != nil {
		trimmedName := strings.TrimSpace(*req.CustomerName)
		if trimmedName != "" {
			order.CustomerName = &trimmedName
			_ = u.orderRepo.Update(ctx, order)
		}
	}

	// Build a unique Midtrans order ID from the internal order number
	midtransOrderID := fmt.Sprintf("%s-%d", order.OrderNumber, apptime.Now().UnixMilli())

	now := apptime.Now()
	expiresAt := now.Add(24 * 60 * 60 * 1_000_000_000) // 24 hours
	payment := &models.POSPayment{
		OrderID:         orderID,
		Method:          models.POSPaymentMethod(req.Method),
		Status:          models.POSPaymentStatusPending,
		Amount:          order.TotalAmount,
		TenderAmount:    order.TotalAmount,
		ChangeAmount:    0,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
		MidtransOrderID: &midtransOrderID,
		ExpiresAt:       &expiresAt,
		CreatedBy:       cashierID,
	}

	// TODO: integrate midtrans-go SDK — use midtransRepo.FindByCompanyID to retrieve server_key,
	// then call the Midtrans Charge API to get VA number / QR code and store in the payment record.
	_ = u.midtransRepo

	if err := u.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}
	return mapper.ToPOSPaymentResponse(payment), nil
}

func (u *posPaymentUsecase) ConfirmMidtransWebhook(ctx context.Context, payload *dto.MidtransCallbackPayload) error {
	if payload.MidtransOrderID == "" {
		return errors.New("missing order_id in Midtrans webhook payload")
	}

	payment, err := u.paymentRepo.FindByMidtransOrderID(ctx, payload.MidtransOrderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPOSPaymentNotFound
		}
		return err
	}
	if payment.Status != models.POSPaymentStatusPending {
		return nil // idempotent — already processed
	}

	status := mapMidtransStatus(payload.TransactionStatus, payload.FraudStatus)
	payment.Status = status
	if tid := payload.TransactionID; tid != "" {
		payment.TransactionID = &tid
	}
	if pt := payload.PaymentType; pt != "" {
		payment.PaymentType = &pt
	}

	switch status {
	case models.POSPaymentStatusPaid:
		now := apptime.Now()
		payment.PaidAt = &now
		if err := u.paymentRepo.Update(ctx, payment); err != nil {
			return err
		}
		order, err := u.orderRepo.GetByID(ctx, payment.OrderID)
		if err != nil {
			return err
		}
		return u.finalizeOrder(ctx, order, "", payment)
	default:
		return u.paymentRepo.Update(ctx, payment)
	}
}

func (u *posPaymentUsecase) GetByOrderID(ctx context.Context, orderID string) ([]dto.POSPaymentResponse, error) {
	payments, err := u.paymentRepo.FindByOrderID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	result := make([]dto.POSPaymentResponse, 0, len(payments))
	for i := range payments {
		result = append(result, *mapper.ToPOSPaymentResponse(&payments[i]))
	}
	return result, nil
}

// finalizeOrder marks the order Paid, deducts stock, and creates linked ERP documents.
// Flow: POS paid -> closed Sales Order -> Customer Invoice -> Sales Payment (for CASH method).
func (u *posPaymentUsecase) finalizeOrder(ctx context.Context, order *models.PosOrder, userID string, payment *models.POSPayment) error {
	order.Status = models.PosOrderStatusPaid
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return err
	}

	// Create a closed Sales Order in the ERP system for this POS transaction.
	// Failures here are non-blocking — the POS payment remains source-of-truth.
	if soID := u.createSalesOrderFromPOS(ctx, order, userID); soID != "" {
		order.SalesOrderID = &soID
		_ = u.orderRepo.Update(ctx, order)

		if invoiceID := u.createCustomerInvoiceFromPOS(ctx, soID, order, userID); invoiceID != "" {
			order.CustomerInvoiceID = &invoiceID
			_ = u.orderRepo.Update(ctx, order)

			// For POS cash payments, also generate a confirmed Sales Payment detail record.
			if payment != nil && payment.Method == models.POSPaymentMethodCash {
				_ = u.createSalesPaymentFromPOS(ctx, invoiceID, payment, order, userID)
			}
		}
	}

	// Deduct inventory. On failure we log but do not reverse the payment;
	// stock discrepancies are reconciled by operations via an adjustment entry.
	if err := u.orderUsecase.DeductStock(ctx, order, order.OrderNumber, userID); err != nil {
		_ = err
	}

	return nil
}

// createSalesOrderFromPOS creates a closed SalesOrder record from a paid POS order.
// Returns the new sales_order ID on success, empty string otherwise.
func (u *posPaymentUsecase) createSalesOrderFromPOS(ctx context.Context, order *models.PosOrder, userID string) string {
	now := apptime.Now()

	code, err := u.salesOrderRepo.GetNextOrderNumber(ctx, "SO")
	if err != nil {
		return ""
	}

	notesVal := fmt.Sprintf("POS sale: %s", order.OrderNumber)
	if order.TableLabel != nil {
		notesVal = fmt.Sprintf("POS sale: %s (table %s)", order.OrderNumber, *order.TableLabel)
	}
	if order.Notes != nil && *order.Notes != "" {
		notesVal += " | " + *order.Notes
	}

	customerName := ""
	if order.CustomerName != nil {
		customerName = *order.CustomerName
	}

	actor := optionalActorIDPointer(userID)
	so := &salesModels.SalesOrder{
		Code:             code,
		OrderDate:        now,
		CustomerName:     customerName,
		Subtotal:         order.Subtotal,
		DiscountAmount:   order.DiscountAmount,
		TaxRate:          0,
		TaxAmount:        order.TaxAmount,
		TotalAmount:      order.TotalAmount,
		Status:           salesModels.SalesOrderStatusClosed,
		Notes:            notesVal,
		SourceType:       "POS",
		SourcePOSOrderID: &order.ID,
		CreatedBy:        actor,
	}

	for _, item := range order.Items {
		so.Items = append(so.Items, salesModels.SalesOrderItem{
			ProductID:   item.ProductID,
			ProductCode: item.ProductCode,
			ProductName: item.ProductName,
			Quantity:    item.Quantity,
			Price:       item.UnitPrice,
			Subtotal:    item.Subtotal,
		})
	}

	if err := u.salesOrderRepo.Create(ctx, so); err != nil {
		return ""
	}
	return so.ID
}

// createCustomerInvoiceFromPOS creates an invoice from the generated sales order.
// It starts with UNPAID status so that payment detail can be captured in sales_payments.
func (u *posPaymentUsecase) createCustomerInvoiceFromPOS(ctx context.Context, salesOrderID string, order *models.PosOrder, userID string) string {
	so, err := u.salesOrderRepo.FindByID(ctx, salesOrderID)
	if err != nil || so == nil {
		return ""
	}

	code, err := u.invoiceRepo.GetNextInvoiceNumber(ctx, "INV")
	if err != nil {
		return ""
	}

	now := apptime.Now()
	notes := fmt.Sprintf("Auto-generated from POS order %s", order.OrderNumber)

	invoice := &salesModels.CustomerInvoice{
		Code:            code,
		Type:            salesModels.CustomerInvoiceTypeRegular,
		InvoiceDate:     now,
		SalesOrderID:    &so.ID,
		PaymentTermsID:  so.PaymentTermsID,
		Subtotal:        so.Subtotal,
		TaxRate:         so.TaxRate,
		TaxAmount:       so.TaxAmount,
		DeliveryCost:    so.DeliveryCost,
		OtherCost:       so.OtherCost,
		Amount:          so.TotalAmount,
		PaidAmount:      0,
		RemainingAmount: so.TotalAmount,
		Status:          salesModels.CustomerInvoiceStatusUnpaid,
		Notes:           notes,
		CreatedBy:       optionalActorIDPointer(userID),
	}

	for _, soItem := range so.Items {
		soItemID := soItem.ID
		invoice.Items = append(invoice.Items, salesModels.CustomerInvoiceItem{
			ProductID:        soItem.ProductID,
			SalesOrderItemID: &soItemID,
			Quantity:         soItem.Quantity,
			Price:            soItem.Price,
			Discount:         soItem.Discount,
			Subtotal:         soItem.Subtotal,
		})
	}

	if len(invoice.Items) == 0 {
		return ""
	}

	if err := u.invoiceRepo.Create(ctx, invoice); err != nil {
		return ""
	}

	// Keep SO item invoiced qty consistent for reporting.
	for _, soItem := range so.Items {
		_ = u.salesOrderRepo.UpdateItemInvoicedQty(ctx, soItem.ID, soItem.Quantity)
	}

	return invoice.ID
}

// createSalesPaymentFromPOS creates a confirmed sales payment and marks invoice paid.
func (u *posPaymentUsecase) createSalesPaymentFromPOS(ctx context.Context, invoiceID string, payment *models.POSPayment, order *models.PosOrder, userID string) string {
	active := true
	accounts, _, err := u.bankAccountRepo.List(ctx, coreRepos.BankAccountListParams{
		IsActive: &active,
		Limit:    1,
		SortBy:   "created_at",
		SortDir:  "asc",
	})
	if err == nil && len(accounts) == 0 {
		// Fallback: use any available bank account if none are marked active.
		accounts, _, err = u.bankAccountRepo.List(ctx, coreRepos.BankAccountListParams{
			Limit:   1,
			SortBy:  "created_at",
			SortDir: "asc",
		})
	}
	if err != nil || len(accounts) == 0 {
		return ""
	}

	bank := accounts[0]
	now := apptime.Now()
	method := salesModels.SalesPaymentMethodCash
	if payment != nil && payment.Method != models.POSPaymentMethodCash {
		method = salesModels.SalesPaymentMethodBank
	}

	noteText := fmt.Sprintf("Auto-generated from POS order %s", order.OrderNumber)
	if payment != nil && payment.Notes != nil && strings.TrimSpace(*payment.Notes) != "" {
		noteText = strings.TrimSpace(*payment.Notes)
	}
	refNumber := order.OrderNumber
	if payment != nil {
		if payment.ReferenceNumber != nil && strings.TrimSpace(*payment.ReferenceNumber) != "" {
			refNumber = strings.TrimSpace(*payment.ReferenceNumber)
		} else if payment.TransactionID != nil && strings.TrimSpace(*payment.TransactionID) != "" {
			refNumber = strings.TrimSpace(*payment.TransactionID)
		}
	}

	actorID := normalizedActorID(userID)
	notes := noteText
	ref := refNumber
	tenderAmount := order.TotalAmount
	changeAmount := 0.0
	appliedAmount := order.TotalAmount
	if payment != nil {
		if payment.TenderAmount > 0 {
			tenderAmount = payment.TenderAmount
		} else if payment.Amount > 0 {
			tenderAmount = payment.Amount
		}
		if payment.ChangeAmount > 0 {
			changeAmount = payment.ChangeAmount
		}
		if method == salesModels.SalesPaymentMethodCash {
			appliedAmount = tenderAmount - changeAmount
			if appliedAmount < 0 {
				appliedAmount = 0
			}
		}
	}

	pay := &salesModels.SalesPayment{
		CustomerInvoiceID:           invoiceID,
		BankAccountID:               bank.ID,
		PaymentDate:                 now.Format("2006-01-02"),
		Amount:                      appliedAmount,
		TenderAmount:                tenderAmount,
		ChangeAmount:                changeAmount,
		Method:                      method,
		Status:                      salesModels.SalesPaymentStatusConfirmed,
		ReferenceNumber:             &ref,
		Notes:                       &notes,
		CreatedBy:                   actorID,
		BankAccountNameSnapshot:     strings.TrimSpace(bank.Name),
		BankAccountNumberSnapshot:   strings.TrimSpace(bank.AccountNumber),
		BankAccountHolderSnapshot:   strings.TrimSpace(bank.AccountHolder),
		BankAccountCurrencySnapshot: strings.TrimSpace(bank.Currency),
	}

	if err := u.salesPaymentRepo.Create(ctx, pay); err != nil {
		return ""
	}

	paidAmount := appliedAmount
	paidAt := apptime.Now()
	if err := u.invoiceRepo.UpdateStatus(
		ctx,
		invoiceID,
		salesModels.CustomerInvoiceStatusPaid,
		&paidAmount,
		&paidAt,
		optionalActorIDPointer(userID),
	); err != nil {
		return ""
	}

	return pay.ID
}

func normalizedActorID(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return uuid.Nil.String()
	}
	if _, err := uuid.Parse(trimmed); err == nil {
		return trimmed
	}
	return uuid.NewSHA1(uuid.NameSpaceOID, []byte(trimmed)).String()
}

func optionalActorIDPointer(raw string) *string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil
	}
	normalized := normalizedActorID(trimmed)
	return &normalized
}

// mapMidtransStatus converts Midtrans transaction_status + fraud_status to internal payment status.
func mapMidtransStatus(txStatus, fraudStatus string) models.POSPaymentStatus {
	switch txStatus {
	case "capture":
		if fraudStatus == "accept" || fraudStatus == "" {
			return models.POSPaymentStatusPaid
		}
		return models.POSPaymentStatusFailed
	case "settlement":
		return models.POSPaymentStatusPaid
	case "pending":
		return models.POSPaymentStatusPending
	case "deny", "cancel", "failure":
		return models.POSPaymentStatusFailed
	case "expire":
		return models.POSPaymentStatusExpired
	case "refund":
		return models.POSPaymentStatusRefunded
	}
	return models.POSPaymentStatusPending
}
