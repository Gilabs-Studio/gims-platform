package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	securityInfra "github.com/gilabs/gims/api/internal/core/infrastructure/security"
	loyaltyDTO "github.com/gilabs/gims/api/internal/loyalty/domain/dto"
	loyaltyUC "github.com/gilabs/gims/api/internal/loyalty/domain/usecase"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
	"github.com/gilabs/gims/api/internal/pos/domain/provider"
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
	// InitiateDigitalPayment creates a Xendit invoice and returns payment details (QR / URL)
	InitiateDigitalPayment(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID, companyID string) (*dto.POSPaymentResponse, error)
	// ConfirmXenditWebhook processes a Xendit server-to-server invoice notification
	ConfirmXenditWebhook(ctx context.Context, payload *dto.XenditWebhookPayload) error
	// GetByOrderID returns all payments for an order
	GetByOrderID(ctx context.Context, orderID string) ([]dto.POSPaymentResponse, error)
}

type posPaymentUsecase struct {
	paymentRepo      repositories.POSPaymentRepository
	orderRepo        repositories.PosOrderRepository
	configRepo       repositories.POSConfigRepository
	xenditRepo       repositories.XenditConfigRepository
	orderUsecase     POSOrderUsecase
	salesOrderRepo   salesRepos.SalesOrderRepository
	invoiceRepo      salesRepos.CustomerInvoiceRepository
	salesPaymentRepo salesRepos.SalesPaymentRepository
	bankAccountRepo  coreRepos.BankAccountRepository
	cipher           *securityInfra.CredentialCipher
	// loyaltyUC is optional; when nil loyalty point accrual is skipped.
	loyaltyUC loyaltyUC.LoyaltyUsecase
}

// WithLoyaltyUsecase injects the loyalty usecase for post-payment point accrual.
func (u *posPaymentUsecase) WithLoyaltyUsecase(uc loyaltyUC.LoyaltyUsecase) *posPaymentUsecase {
	u.loyaltyUC = uc
	return u
}

const maxXenditDescriptionLen = 200

// NewPOSPaymentUsecase constructs a POSPaymentUsecase.
func NewPOSPaymentUsecase(
	paymentRepo repositories.POSPaymentRepository,
	orderRepo repositories.PosOrderRepository,
	configRepo repositories.POSConfigRepository,
	xenditRepo repositories.XenditConfigRepository,
	orderUsecase POSOrderUsecase,
	salesOrderRepo salesRepos.SalesOrderRepository,
	invoiceRepo salesRepos.CustomerInvoiceRepository,
	salesPaymentRepo salesRepos.SalesPaymentRepository,
	bankAccountRepo coreRepos.BankAccountRepository,
	cipher *securityInfra.CredentialCipher,
) *posPaymentUsecase {
	return &posPaymentUsecase{
		paymentRepo:      paymentRepo,
		orderRepo:        orderRepo,
		configRepo:       configRepo,
		xenditRepo:       xenditRepo,
		orderUsecase:     orderUsecase,
		salesOrderRepo:   salesOrderRepo,
		invoiceRepo:      invoiceRepo,
		salesPaymentRepo: salesPaymentRepo,
		bankAccountRepo:  bankAccountRepo,
		cipher:           cipher,
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

	// Update customer info on the order if provided (used on receipt/invoice/SO).
	if applyCustomerInfoToOrder(order, req) {
		_ = u.orderRepo.Update(ctx, order)
	}

	now := apptime.Now()
	change := req.Amount - order.TotalAmount
	payment := &models.POSPayment{
		OrderID:         orderID,
		Method:          models.POSPaymentMethod(req.Method),
		Status:          models.POSPaymentStatusPaid,
		Amount:          req.Amount,
		TenderAmount:    req.Amount,
		ChangeAmount:    change,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
		PaidAt:          &now,
		CreatedBy:       cashierID,
	}
	if err := u.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}
	if err := u.finalizeOrder(ctx, order, cashierID, payment); err != nil {
		return nil, err
	}
	return mapper.ToPOSPaymentResponse(payment), nil
}

func (u *posPaymentUsecase) InitiateDigitalPayment(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID, companyID string) (*dto.POSPaymentResponse, error) {
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

	// Fetch the merchant's Xendit account config; payment requires an active connection
	xenditCfg, err := u.xenditRepo.FindByCompanyID(ctx, companyID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: payment gateway not configured for this company")
		}
		return nil, err
	}
	if !xenditCfg.IsConnected() {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: payment gateway is not active")
	}

	decryptedSecretKey, err := u.cipher.Decrypt(xenditCfg.SecretKey)
	if err != nil {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: invalid payment gateway credentials")
	}

	// Persist customer info from payment form if provided.
	if applyCustomerInfoToOrder(order, req) {
		_ = u.orderRepo.Update(ctx, order)
	}

	// Build a unique external order ID for Xendit invoice tracking
	externalOrderID := fmt.Sprintf("%s-%d", order.OrderNumber, apptime.Now().UnixMilli())

	description := buildXenditOrderDescription(order)

	// Build Xendit invoice request with optional channel filtering
	invoiceReq := provider.InvoiceRequest{
		ExternalID:  externalOrderID,
		Amount:      order.TotalAmount,
		Description: description,
		Currency:    "IDR",
	}

	// Restrict to a specific payment channel when provided by the cashier
	if req.ChannelCode != nil && *req.ChannelCode != "" {
		invoiceReq.PaymentMethods = []string{*req.ChannelCode}
	}

	// Create Xendit invoice routed to the merchant's sub-account
	xenditProvider := provider.NewXenditProvider(decryptedSecretKey, xenditCfg.XenditAccountID)
	invoice, err := xenditProvider.CreateInvoice(ctx, invoiceReq)
	if err != nil {
		return nil, fmt.Errorf("XENDIT_INVOICE_FAILED: %w", err)
	}

	now := apptime.Now()
	expiresAt := now.Add(24 * 60 * 60 * 1_000_000_000) // 24-hour default expiry

	payment := &models.POSPayment{
		OrderID:         orderID,
		Method:          models.POSPaymentMethodDigital,
		Status:          models.POSPaymentStatusPending,
		Amount:          order.TotalAmount,
		TenderAmount:    order.TotalAmount,
		ChangeAmount:    0,
		ReferenceNumber: req.ReferenceNumber,
		Notes:           req.Notes,
		ExternalOrderID: &externalOrderID,
		XenditInvoiceID: &invoice.ID,
		PaymentURL:      &invoice.InvoiceURL,
		ExpiresAt:       &expiresAt,
		CreatedBy:       cashierID,
	}

	// Store the requested channel code for tracking
	if req.ChannelCode != nil && *req.ChannelCode != "" {
		payment.PaymentType = req.ChannelCode
	}

	// Store QR code string if Xendit returned one (QRIS-enabled invoices)
	if invoice.QRCode != "" {
		payment.QrCode = &invoice.QRCode
	}

	// Store VA number if Xendit returned bank transfer details
	if len(invoice.AvailableBanks) > 0 {
		payment.VaNumber = &invoice.AvailableBanks[0].BankAccountNumber
	}

	if err := u.paymentRepo.Create(ctx, payment); err != nil {
		return nil, err
	}
	return mapper.ToPOSPaymentResponse(payment), nil
}

func applyCustomerInfoToOrder(order *models.PosOrder, req *dto.ProcessPaymentRequest) bool {
	needsUpdate := false

	if req.CustomerID != nil {
		trimmedID := strings.TrimSpace(*req.CustomerID)
		if trimmedID != "" {
			order.CustomerID = &trimmedID
			needsUpdate = true
		}
	}
	if req.CustomerName != nil {
		trimmedName := strings.TrimSpace(*req.CustomerName)
		if trimmedName != "" {
			order.CustomerName = &trimmedName
			needsUpdate = true
		}
	}
	if req.CustomerPhone != nil {
		trimmedPhone := strings.TrimSpace(*req.CustomerPhone)
		if trimmedPhone != "" {
			order.CustomerPhone = &trimmedPhone
			needsUpdate = true
		}
	}
	if req.CustomerEmail != nil {
		trimmedEmail := strings.TrimSpace(*req.CustomerEmail)
		if trimmedEmail != "" {
			order.CustomerEmail = &trimmedEmail
			needsUpdate = true
		}
	}

	return needsUpdate
}

func buildXenditOrderDescription(order *models.PosOrder) string {
	itemSummaries := make([]string, 0, len(order.Items))
	for _, item := range order.Items {
		name := strings.TrimSpace(item.ProductName)
		if name == "" {
			continue
		}

		qty := formatOrderItemQuantity(item.Quantity)
		if qty == "" {
			itemSummaries = append(itemSummaries, name)
			continue
		}

		itemSummaries = append(itemSummaries, fmt.Sprintf("%sx %s", qty, name))
	}

	if len(itemSummaries) == 0 {
		return "POS purchase"
	}

	const prefix = "POS Items: "
	parts := make([]string, 0, len(itemSummaries))

	for i, summary := range itemSummaries {
		candidate := append(parts, summary)
		remaining := len(itemSummaries) - (i + 1)
		desc := prefix + strings.Join(candidate, ", ")
		if remaining > 0 {
			desc += fmt.Sprintf(", +%d item lainnya", remaining)
		}

		if len(desc) > maxXenditDescriptionLen {
			break
		}
		parts = candidate
	}

	if len(parts) == 0 {
		first := itemSummaries[0]
		available := maxXenditDescriptionLen - len(prefix)
		if available <= 0 {
			return "POS purchase"
		}
		if len(first) > available {
			first = first[:available]
		}
		return prefix + first
	}

	description := prefix + strings.Join(parts, ", ")
	remaining := len(itemSummaries) - len(parts)
	if remaining > 0 {
		suffix := fmt.Sprintf(", +%d item lainnya", remaining)
		if len(description)+len(suffix) <= maxXenditDescriptionLen {
			description += suffix
		}
	}

	return description
}

func formatOrderItemQuantity(quantity float64) string {
	if quantity <= 0 {
		return ""
	}

	if quantity == float64(int64(quantity)) {
		return fmt.Sprintf("%d", int64(quantity))
	}

	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.3f", quantity), "0"), ".")
}

func (u *posPaymentUsecase) ConfirmXenditWebhook(ctx context.Context, payload *dto.XenditWebhookPayload) error {
	if payload.ExternalID == "" {
		return errors.New("missing external_id in Xendit webhook payload")
	}

	payment, err := u.paymentRepo.FindByExternalOrderID(ctx, payload.ExternalID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPOSPaymentNotFound
		}
		return err
	}
	if payment.Status != models.POSPaymentStatusPending {
		return nil // idempotent — already processed
	}

	var newStatus models.POSPaymentStatus
	switch strings.ToUpper(payload.Status) {
	case "PAID", "SETTLED":
		newStatus = models.POSPaymentStatusPaid
	case "EXPIRED":
		newStatus = models.POSPaymentStatusExpired
	default:
		newStatus = models.POSPaymentStatusFailed
	}

	payment.Status = newStatus
	if payload.PaymentMethod != "" {
		payment.PaymentType = &payload.PaymentMethod
	}
	if payload.PaymentChannel != "" {
		ch := payload.PaymentChannel
		payment.TransactionID = &ch
	}

	switch newStatus {
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

			// Record settlement into sales payments for every successfully paid POS transaction.
			if payment != nil {
				_ = u.createSalesPaymentFromPOS(ctx, invoiceID, payment, order, userID)
			}
		}
	}

	// Deduct inventory. On failure we log but do not reverse the payment;
	// stock discrepancies are reconciled by operations via an adjustment entry.
	if err := u.orderUsecase.DeductStock(ctx, order, order.OrderNumber, userID); err != nil {
		_ = err
	}

	// Award loyalty points when the order is linked to a loyalty member.
	// Failures are non-blocking — the payment is the source of truth.
	if u.loyaltyUC != nil && order.LoyaltyMemberID != nil {
		processedBy := userID
		_, _ = u.loyaltyUC.EarnPoints(ctx, &loyaltyDTO.EarnPointsRequest{
			MemberID:        *order.LoyaltyMemberID,
			TransactionID:   order.ID,
			TransactionType: "pos_order",
			TotalAmount:     order.TotalAmount,
			ProcessedBy:     &processedBy,
		})
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
	customerPhone := ""
	if order.CustomerPhone != nil {
		customerPhone = *order.CustomerPhone
	}
	customerEmail := ""
	if order.CustomerEmail != nil {
		customerEmail = *order.CustomerEmail
	}

	taxRatePercent := deriveTaxRatePercent(order)
	serviceCharge := order.ServiceCharge
	if serviceCharge < 0 {
		serviceCharge = 0
	}

	actor := optionalActorIDPointer(userID)
	so := &salesModels.SalesOrder{
		Code:             code,
		OrderDate:        now,
		CustomerID:       order.CustomerID,
		CustomerName:     customerName,
		CustomerPhone:    customerPhone,
		CustomerEmail:    customerEmail,
		Subtotal:         order.Subtotal,
		DiscountAmount:   order.DiscountAmount,
		TaxRate:          taxRatePercent,
		TaxAmount:        order.TaxAmount,
		OtherCost:        serviceCharge,
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

func deriveTaxRatePercent(order *models.PosOrder) float64 {
	taxableBase := order.Subtotal - order.DiscountAmount
	if taxableBase <= 0 || order.TaxAmount <= 0 {
		return 0
	}

	ratePercent := (order.TaxAmount / taxableBase) * 100
	if ratePercent < 0 {
		return 0
	}

	return math.Round(ratePercent*100) / 100
}
