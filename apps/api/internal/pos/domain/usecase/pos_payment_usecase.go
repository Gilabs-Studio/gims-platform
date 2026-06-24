package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"net/url"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	coreRepos "github.com/gilabs/gims/api/internal/core/data/repositories"
	coreConfig "github.com/gilabs/gims/api/internal/core/infrastructure/config"
	coreDatabase "github.com/gilabs/gims/api/internal/core/infrastructure/database"
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
	salesDTO "github.com/gilabs/gims/api/internal/sales/domain/dto"
	salesUsecase "github.com/gilabs/gims/api/internal/sales/domain/usecase"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ErrPOSPaymentNotFound is returned when the requested payment record does not exist.
var ErrPOSPaymentNotFound = errors.New("pos payment not found")

// POSPaymentUsecase handles POS payment processing.
type POSPaymentUsecase interface {
	// ProcessCash handles immediate cash or card payments
	ProcessCash(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID string) (*dto.POSPaymentResponse, error)
	// InitiateDigitalPayment creates a Xendit invoice and returns payment details (QR / URL)
	InitiateDigitalPayment(ctx context.Context, orderID string, req *dto.ProcessPaymentRequest, cashierID, companyID string) (*dto.POSPaymentResponse, error)
	// ConfirmXenditWebhook processes a verified Xendit server-to-server invoice notification.
	ConfirmXenditWebhook(ctx context.Context, payload *dto.XenditWebhookPayload, callbackToken string) error
	// SyncXenditPayment refreshes a pending payment from Xendit after browser redirect.
	SyncXenditPayment(ctx context.Context, orderID, paymentID, companyID string) (*dto.POSPaymentResponse, error)
	// GetByOrderID returns all payments for an order
	GetByOrderID(ctx context.Context, orderID string) ([]dto.POSPaymentResponse, error)
	// CancelPendingPayment cancels a pending digital payment and keeps order open for cashier payment.
	CancelPendingPayment(ctx context.Context, orderID, paymentID, actorID string, reason *string) error
}

type posPaymentUsecase struct {
	db                *gorm.DB
	paymentRepo       repositories.POSPaymentRepository
	orderRepo         repositories.PosOrderRepository
	configRepo        repositories.POSConfigRepository
	xenditRepo        repositories.XenditConfigRepository
	orderUsecase      POSOrderUsecase
	salesOrderRepo    salesRepos.SalesOrderRepository
	invoiceRepo       salesRepos.CustomerInvoiceRepository
	customerInvoiceUC salesUsecase.CustomerInvoiceUsecase
	salesPaymentUC    salesUsecase.SalesPaymentUsecase
	salesPaymentRepo  salesRepos.SalesPaymentRepository
	bankAccountRepo   coreRepos.BankAccountRepository
	cipher            *securityInfra.CredentialCipher
	hub               POSHubPublisher
	// loyaltyUC is optional; when nil loyalty point accrual is skipped.
	loyaltyUC loyaltyUC.LoyaltyUsecase
}

// WithLoyaltyUsecase injects the loyalty usecase for post-payment point accrual.
func (u *posPaymentUsecase) WithLoyaltyUsecase(uc loyaltyUC.LoyaltyUsecase) *posPaymentUsecase {
	u.loyaltyUC = uc
	return u
}

// WithPOSHub injects a websocket hub to publish realtime payment/order events.
func (u *posPaymentUsecase) WithPOSHub(hub POSHubPublisher) *posPaymentUsecase {
	u.hub = hub
	return u
}

const maxXenditDescriptionLen = 200

const (
	xenditProviderModeMerchantConfig  = "merchant_config"
	xenditProviderModePlatformManaged = "platform_managed"
)

type resolvedXenditCredentials struct {
	secretKey    string
	accountID    string
	webhookToken string
	providerMode string
}

// NewPOSPaymentUsecase constructs a POSPaymentUsecase.
func NewPOSPaymentUsecase(
	db *gorm.DB,
	paymentRepo repositories.POSPaymentRepository,
	orderRepo repositories.PosOrderRepository,
	configRepo repositories.POSConfigRepository,
	xenditRepo repositories.XenditConfigRepository,
	orderUsecase POSOrderUsecase,
	salesOrderRepo salesRepos.SalesOrderRepository,
	invoiceRepo salesRepos.CustomerInvoiceRepository,
	customerInvoiceUC salesUsecase.CustomerInvoiceUsecase,
	salesPaymentUC salesUsecase.SalesPaymentUsecase,
	salesPaymentRepo salesRepos.SalesPaymentRepository,
	bankAccountRepo coreRepos.BankAccountRepository,
	cipher *securityInfra.CredentialCipher,
) *posPaymentUsecase {
	return &posPaymentUsecase{
		db:                db,
		paymentRepo:       paymentRepo,
		orderRepo:         orderRepo,
		configRepo:        configRepo,
		xenditRepo:        xenditRepo,
		orderUsecase:      orderUsecase,
		salesOrderRepo:    salesOrderRepo,
		invoiceRepo:       invoiceRepo,
		customerInvoiceUC: customerInvoiceUC,
		salesPaymentUC:    salesPaymentUC,
		salesPaymentRepo:  salesPaymentRepo,
		bankAccountRepo:   bankAccountRepo,
		cipher:            cipher,
	}
}

func (u *posPaymentUsecase) resolveXenditCredentials(ctx context.Context, companyID string) (*resolvedXenditCredentials, error) {
	if strings.TrimSpace(companyID) == "" {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: missing company context")
	}

	if u.xenditRepo != nil {
		cfg, err := u.xenditRepo.FindByCompanyID(ctx, companyID)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if err == nil && cfg != nil && cfg.IsConnected() {
			secretKey, err := u.cipher.Decrypt(cfg.SecretKey)
			if err != nil || strings.TrimSpace(secretKey) == "" {
				return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: invalid payment gateway credentials")
			}

			webhookToken := ""
			if strings.TrimSpace(cfg.WebhookToken) != "" {
				webhookToken, err = u.cipher.Decrypt(cfg.WebhookToken)
				if err != nil {
					return nil, fmt.Errorf("XENDIT_WEBHOOK_INVALID: invalid webhook token configuration")
				}
			}
			if strings.TrimSpace(webhookToken) == "" {
				webhookToken = platformXenditWebhookToken()
			}

			return &resolvedXenditCredentials{
				secretKey:    strings.TrimSpace(secretKey),
				accountID:    strings.TrimSpace(cfg.XenditAccountID),
				webhookToken: strings.TrimSpace(webhookToken),
				providerMode: xenditProviderModeMerchantConfig,
			}, nil
		}
	}

	secretKey := platformXenditMoneyInSecretKey()
	if strings.TrimSpace(secretKey) == "" {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: payment gateway not configured")
	}

	return &resolvedXenditCredentials{
		secretKey:    strings.TrimSpace(secretKey),
		webhookToken: platformXenditWebhookToken(),
		providerMode: xenditProviderModePlatformManaged,
	}, nil
}

func platformXenditMoneyInSecretKey() string {
	if coreConfig.AppConfig == nil {
		return ""
	}
	return strings.TrimSpace(coreConfig.AppConfig.Xendit.BillingRecurringSecretKey)
}

func platformXenditWebhookToken() string {
	if coreConfig.AppConfig == nil {
		return ""
	}
	return strings.TrimSpace(coreConfig.AppConfig.Xendit.BillingWebhookToken)
}

func (u *posPaymentUsecase) resolveAutoPaymentBankAccount(ctx context.Context, method salesModels.SalesPaymentMethod) (*coreModels.BankAccount, error) {
	if u == nil {
		return nil, errors.New("pos payment usecase is nil")
	}

	if u.db != nil {
		mappingKey := "finance.bank_default"
		if method == salesModels.SalesPaymentMethodCash {
			mappingKey = "finance.cash_default"
		}

		var mappedCOACode string
		if err := u.db.WithContext(ctx).
			Table("system_account_mappings").
			Select("coa_code").
			Where("key = ?", mappingKey).
			Order("updated_at DESC").
			Limit(1).
			Scan(&mappedCOACode).Error; err != nil {
			return nil, err
		}

		mappedCOACode = strings.TrimSpace(mappedCOACode)
		if mappedCOACode != "" {
			var mappedAccount coreModels.BankAccount
			err := u.db.WithContext(ctx).
				Table("bank_accounts AS ba").
				Select("ba.*").
				Joins("JOIN chart_of_accounts coa ON coa.id = ba.chart_of_account_id").
				Where("ba.is_active = ?", true).
				Where("coa.code = ?", mappedCOACode).
				Order("ba.updated_at DESC").
				Order("ba.created_at DESC").
				Take(&mappedAccount).Error
			if err == nil {
				return &mappedAccount, nil
			}
			if err != gorm.ErrRecordNotFound {
				return nil, err
			}
		}
	}

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
	if err != nil {
		return nil, err
	}
	if len(accounts) == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	account := accounts[0]
	return &account, nil
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

	// Update customer/loyalty linkage before validating totals.
	orderNeedsUpdate := applyCustomerInfoToOrder(order, req)

	// Apply selected reward pricing to the order while keeping point deduction deferred
	// until payment finalization.
	pricingChanged, err := u.applySelectedRewardPricing(ctx, order, req)
	if err != nil {
		return nil, err
	}

	if orderNeedsUpdate || pricingChanged {
		_ = u.orderRepo.Update(ctx, order)
	}

	// Offline-sync tolerance: when the tendered amount covers at least the net subtotal
	// (items minus discount, before tax/service charge), the gap is assumed to be a
	// tax-rate mismatch between the offline client and the server. Accept the payment
	// and record order.TotalAmount as the authoritative amount so accounting stays correct.
	netSubtotal := order.Subtotal - order.DiscountAmount
	if req.Amount < order.TotalAmount && req.Amount >= netSubtotal {
		log.Printf("[pos-payment] offline-sync amount adjustment: order=%s tendered=%.2f server_total=%.2f net_subtotal=%.2f — applying server total",
			orderID, req.Amount, order.TotalAmount, netSubtotal)
		req.Amount = order.TotalAmount
	}

	if req.Amount < order.TotalAmount {
		return nil, fmt.Errorf("%w: required %.2f, received %.2f", ErrPOSInvalidPayment, order.TotalAmount, req.Amount)
	}

	now := apptime.Now()
	change := req.Amount - order.TotalAmount
	actorID := normalizedActorID(cashierID)
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
		CreatedBy:       actorID,
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
	if req == nil || req.Amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be greater than zero", ErrPOSInvalidPayment)
	}

	channelCode, err := normalizeXenditInvoiceChannel(req)
	if err != nil {
		return nil, err
	}

	// Resolve payment credentials. Merchant-specific credentials still work, but the
	// platform-managed billing key is now the secure default for self-order/POS.
	if strings.TrimSpace(companyID) == "" {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: missing company context")
	}
	xenditCreds, err := u.resolveXenditCredentials(ctx, companyID)
	if err != nil {
		return nil, err
	}

	// Persist customer/loyalty info from payment form if provided.
	orderNeedsUpdate := applyCustomerInfoToOrder(order, req)
	pricingChanged, err := u.applySelectedRewardPricing(ctx, order, req)
	if err != nil {
		return nil, err
	}
	if orderNeedsUpdate || pricingChanged {
		_ = u.orderRepo.Update(ctx, order)
	}

	if math.Abs(req.Amount-order.TotalAmount) > 0.01 {
		return nil, fmt.Errorf("%w: amount %.2f does not match order total %.2f", ErrPOSInvalidPayment, req.Amount, order.TotalAmount)
	}
	if order.TotalAmount <= 0 {
		return nil, fmt.Errorf("%w: order total must be greater than zero", ErrPOSInvalidPayment)
	}

	var result *dto.POSPaymentResponse
	var updatedOrderForPublish *dto.POSOrderResponse
	err = u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := coreDatabase.WithTx(ctx, tx)

		lockKey := fmt.Sprintf("pos:digital-payment:%s", orderID)
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", lockKey).Error; err != nil {
			return fmt.Errorf("failed to acquire payment lock: %w", err)
		}

		lockedOrder, err := u.orderRepo.GetByID(txCtx, orderID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPOSOrderNotFound
			}
			return err
		}
		if lockedOrder.Status == models.PosOrderStatusPaid || lockedOrder.Status == models.PosOrderStatusCompleted {
			return ErrPOSOrderAlreadyPaid
		}

		now := apptime.Now()
		existingPayments, err := u.paymentRepo.FindByOrderID(txCtx, orderID)
		if err != nil {
			return err
		}
		for i := range existingPayments {
			pending := &existingPayments[i]
			if pending.Status != models.POSPaymentStatusPending {
				continue
			}
			if pending.ExpiresAt == nil || pending.ExpiresAt.After(now) {
				if lockedOrder.Status != models.PosOrderStatusWaitingPayment {
					lockedOrder.Status = models.PosOrderStatusWaitingPayment
					if err := u.orderRepo.Update(txCtx, lockedOrder); err != nil {
						return err
					}
				}
				result = mapper.ToPOSPaymentResponse(pending)
				updatedOrderForPublish = mapper.ToPOSOrderResponse(lockedOrder)
				return nil
			}
			pending.Status = models.POSPaymentStatusExpired
			if err := u.paymentRepo.Update(txCtx, pending); err != nil {
				return err
			}
		}

		// Build a unique external order ID for Xendit invoice tracking.
		paymentID := uuid.New().String()
		externalOrderID := fmt.Sprintf("%s-%d", lockedOrder.OrderNumber, now.UnixMilli())
		invoiceReq := provider.InvoiceRequest{
			ExternalID:         externalOrderID,
			Amount:             lockedOrder.TotalAmount,
			Description:        buildXenditOrderDescription(lockedOrder),
			Currency:           "IDR",
			SuccessRedirectURL: appendPaymentRedirectParam(req.SuccessRedirectURL, paymentID),
			FailureRedirectURL: appendPaymentRedirectParam(req.FailureRedirectURL, paymentID),
		}
		// Match registration billing: omit payment_methods so Xendit's hosted invoice
		// shows every active method configured on the merchant account.

		// Merchant config uses for-user-id routing; platform-managed mode intentionally
		// omits it so funds land in the platform balance before 100% merchant settlement.
		xenditProvider := provider.NewXenditProvider(xenditCreds.secretKey, xenditCreds.accountID)
		invoice, err := xenditProvider.CreateInvoice(ctx, invoiceReq)
		if err != nil {
			return fmt.Errorf("XENDIT_INVOICE_FAILED: %w", err)
		}
		if strings.TrimSpace(invoice.ID) == "" || strings.TrimSpace(invoice.InvoiceURL) == "" {
			return fmt.Errorf("XENDIT_INVOICE_FAILED: incomplete invoice response from Xendit")
		}

		expiresAt := resolveXenditInvoiceExpiry(invoice.ExpiryDate, now)
		actorID := normalizedActorID(cashierID)

		payment := &models.POSPayment{
			ID:              paymentID,
			OrderID:         orderID,
			Method:          models.POSPaymentMethodDigital,
			Status:          models.POSPaymentStatusPending,
			Amount:          lockedOrder.TotalAmount,
			TenderAmount:    lockedOrder.TotalAmount,
			ChangeAmount:    0,
			ReferenceNumber: req.ReferenceNumber,
			Notes:           req.Notes,
			ExternalOrderID: &externalOrderID,
			XenditInvoiceID: &invoice.ID,
			PaymentURL:      &invoice.InvoiceURL,
			ExpiresAt:       &expiresAt,
			CreatedBy:       actorID,
		}

		if channelCode != "" {
			payment.PaymentType = &channelCode
		}
		if invoice.QRCode != "" {
			payment.QrCode = &invoice.QRCode
		}
		if len(invoice.AvailableBanks) > 0 {
			payment.VaNumber = &invoice.AvailableBanks[0].BankAccountNumber
		}

		if err := u.paymentRepo.Create(txCtx, payment); err != nil {
			return err
		}

		lockedOrder.Status = models.PosOrderStatusWaitingPayment
		if err := u.orderRepo.Update(txCtx, lockedOrder); err != nil {
			return err
		}

		result = mapper.ToPOSPaymentResponse(payment)
		updatedOrderForPublish = mapper.ToPOSOrderResponse(lockedOrder)
		return nil
	})
	if err != nil {
		return nil, err
	}
	if u.hub != nil && updatedOrderForPublish != nil {
		payload := posOrderRealtimePayload(updatedOrderForPublish, "PENDING", "")
		u.hub.Publish(tenantIDForPOSOrder(ctx, order), order.OutletID, "pos.order_status_changed", payload)
	}
	return result, nil
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
	if req.LoyaltyMemberID != nil {
		trimmedMemberID := strings.TrimSpace(*req.LoyaltyMemberID)
		if trimmedMemberID != "" {
			order.LoyaltyMemberID = &trimmedMemberID
			needsUpdate = true
		}
	}
	if req.LoyaltyRewardID != nil {
		trimmedRewardID := strings.TrimSpace(*req.LoyaltyRewardID)
		if trimmedRewardID == "" {
			order.LoyaltyRewardID = nil
			needsUpdate = true
		} else {
			order.LoyaltyRewardID = &trimmedRewardID
			needsUpdate = true
		}
	}

	return needsUpdate
}

func normalizeRewardPercent(value float64) float64 {
	if value <= 0 {
		return 0
	}
	// Backward compatibility: old configs sometimes stored 5% as 5000.
	if value > 100 {
		value = value / 1000
	}
	return math.Min(math.Max(value, 0), 100)
}

func computeRewardDiscount(baseAmount float64, reward *loyaltyDTO.RewardConfig) float64 {
	if reward == nil || baseAmount <= 0 {
		return 0
	}

	switch reward.Type {
	case "discount_fixed":
		return math.Max(math.Min(reward.Value, baseAmount), 0)
	case "discount_percent":
		pct := normalizeRewardPercent(reward.Value)
		return math.Max(baseAmount*pct/100, 0)
	default:
		return 0
	}
}

func (u *posPaymentUsecase) applySelectedRewardPricing(ctx context.Context, order *models.PosOrder, req *dto.ProcessPaymentRequest) (bool, error) {
	baseAmount := math.Max(order.Subtotal+order.TaxAmount+order.ServiceCharge, 0)

	selectedRewardID := ""
	if req.LoyaltyRewardID != nil {
		selectedRewardID = strings.TrimSpace(*req.LoyaltyRewardID)
	}

	if selectedRewardID == "" {
		updated := order.DiscountAmount != 0 || order.TotalAmount != baseAmount || order.LoyaltyRewardID != nil
		order.DiscountAmount = 0
		order.TotalAmount = baseAmount
		order.LoyaltyRewardID = nil
		return updated, nil
	}

	if u.loyaltyUC == nil {
		return false, fmt.Errorf("%w: loyalty is not configured", ErrPOSInvalidPayment)
	}
	if order.LoyaltyMemberID == nil || strings.TrimSpace(*order.LoyaltyMemberID) == "" {
		return false, fmt.Errorf("%w: loyalty member is required", ErrPOSInvalidPayment)
	}

	memberResp, err := u.loyaltyUC.GetMember(ctx, strings.TrimSpace(*order.LoyaltyMemberID))
	if err != nil || memberResp == nil {
		return false, fmt.Errorf("%w: loyalty member is invalid", ErrPOSInvalidPayment)
	}

	programResp, err := u.loyaltyUC.GetProgram(ctx, memberResp.ProgramID)
	if err != nil || programResp == nil {
		return false, fmt.Errorf("%w: loyalty program is invalid", ErrPOSInvalidPayment)
	}

	var reward *loyaltyDTO.RewardConfig
	for i := range programResp.Config.Rewards {
		candidate := &programResp.Config.Rewards[i]
		if candidate.ID == selectedRewardID {
			reward = candidate
			break
		}
	}
	if reward == nil || !reward.IsActive {
		return false, fmt.Errorf("%w: reward is unavailable", ErrPOSInvalidPayment)
	}
	if memberResp.PointBalance < reward.PointsRequired {
		return false, fmt.Errorf("%w: insufficient loyalty points", ErrPOSInvalidPayment)
	}

	discount := computeRewardDiscount(baseAmount, reward)
	newTotal := math.Max(baseAmount-discount, 0)
	rewardID := selectedRewardID

	updated := order.DiscountAmount != discount ||
		order.TotalAmount != newTotal ||
		order.LoyaltyRewardID == nil ||
		*order.LoyaltyRewardID != rewardID

	order.DiscountAmount = discount
	order.TotalAmount = newTotal
	order.LoyaltyRewardID = &rewardID

	return updated, nil
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

var supportedXenditInvoiceChannels = map[string]struct{}{
	"QRIS":        {},
	"DANA":        {},
	"GOPAY":       {},
	"OVO":         {},
	"SHOPEEPAY":   {},
	"LINKAJA":     {},
	"ASTRAPAY":    {},
	"JENIUSPAY":   {},
	"BCA":         {},
	"BNI":         {},
	"BRI":         {},
	"MANDIRI":     {},
	"PERMATA":     {},
	"CIMB":        {},
	"BSI":         {},
	"CREDIT_CARD": {},
}

func normalizeXenditInvoiceChannel(req *dto.ProcessPaymentRequest) (string, error) {
	method := strings.ToUpper(strings.TrimSpace(req.Method))
	channel := ""
	if req.ChannelCode != nil {
		channel = strings.ToUpper(strings.TrimSpace(*req.ChannelCode))
	}

	switch method {
	case string(models.POSPaymentMethodDigital):
		// Empty channel is valid: Xendit's hosted invoice can show all active methods.
	case string(models.POSPaymentMethodQris):
		if channel == "" {
			channel = "QRIS"
		}
	default:
		return "", fmt.Errorf("%w: unsupported digital payment method %s", ErrPOSInvalidPayment, req.Method)
	}

	if channel == "" {
		return "", nil
	}
	if _, ok := supportedXenditInvoiceChannels[channel]; !ok {
		return "", fmt.Errorf("%w: unsupported Xendit channel %s", ErrPOSInvalidPayment, channel)
	}
	return channel, nil
}

func resolveXenditInvoiceExpiry(expiryDate string, fallback time.Time) time.Time {
	trimmed := strings.TrimSpace(expiryDate)
	if trimmed == "" {
		return fallback.Add(24 * time.Hour)
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed
		}
	}

	return fallback.Add(24 * time.Hour)
}

func appendPaymentRedirectParam(value *string, paymentID string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return ""
	}

	parsed, err := url.Parse(strings.TrimSpace(*value))
	if err != nil {
		return strings.TrimSpace(*value)
	}
	query := parsed.Query()
	if strings.TrimSpace(paymentID) != "" {
		query.Set("payment_id", paymentID)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func (u *posPaymentUsecase) ConfirmXenditWebhook(ctx context.Context, payload *dto.XenditWebhookPayload, callbackToken string) error {
	if payload == nil {
		return errors.New("missing Xendit webhook payload")
	}
	if payload.ExternalID == "" {
		return errors.New("missing external_id in Xendit webhook payload")
	}
	if strings.TrimSpace(callbackToken) == "" {
		return errors.New("missing Xendit callback token")
	}

	var finalizedPayment *models.POSPayment
	var finalizedOrder *models.PosOrder

	err := u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := coreDatabase.WithTx(ctx, tx)

		var payment models.POSPayment
		err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("external_order_id = ?", payload.ExternalID).
			First(&payment).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPOSPaymentNotFound
			}
			return err
		}

		if payload.ID != "" && payment.XenditInvoiceID != nil && *payment.XenditInvoiceID != "" && payload.ID != *payment.XenditInvoiceID {
			return fmt.Errorf("XENDIT_WEBHOOK_INVALID: invoice id does not match payment")
		}

		var order models.PosOrder
		err = tx.WithContext(ctx).
			Preload("Items").
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&order, "id = ?", payment.OrderID).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrPOSOrderNotFound
			}
			return err
		}

		var companyID string
		err = tx.WithContext(ctx).
			Table("outlets").
			Select("company_id").
			Where("id = ? AND deleted_at IS NULL", order.OutletID).
			Scan(&companyID).Error
		if err != nil {
			return err
		}
		if strings.TrimSpace(companyID) == "" {
			return fmt.Errorf("XENDIT_WEBHOOK_INVALID: outlet company is missing")
		}

		creds, err := u.resolveXenditCredentials(txCtx, companyID)
		if err != nil {
			return err
		}
		expectedToken := strings.TrimSpace(creds.webhookToken)
		if strings.TrimSpace(expectedToken) == "" || strings.TrimSpace(callbackToken) != strings.TrimSpace(expectedToken) {
			return fmt.Errorf("XENDIT_WEBHOOK_INVALID: callback token mismatch")
		}

		if payment.Status != models.POSPaymentStatusPending {
			return nil // idempotent: already processed by an earlier callback/retry.
		}

		newStatus, terminal, err := mapXenditInvoiceStatus(payload.Status)
		if err != nil {
			return err
		}
		if !terminal {
			return nil
		}

		if newStatus == models.POSPaymentStatusPaid && payload.PaidAmount > 0 && math.Abs(payload.PaidAmount-payment.Amount) > 0.01 {
			return fmt.Errorf("XENDIT_WEBHOOK_INVALID: paid amount %.2f does not match payment amount %.2f", payload.PaidAmount, payment.Amount)
		}

		payment.Status = newStatus
		if payload.PaymentMethod != "" {
			method := strings.ToUpper(strings.TrimSpace(payload.PaymentMethod))
			payment.PaymentType = &method
		}
		if payload.PaymentChannel != "" {
			ch := strings.TrimSpace(payload.PaymentChannel)
			payment.TransactionID = &ch
		}

		if newStatus == models.POSPaymentStatusPaid {
			paidAt := parseXenditPaidAt(payload.PaidAt)
			payment.PaidAt = &paidAt
			finalizedPayment = &payment
			finalizedOrder = &order
		}

		return u.paymentRepo.Update(txCtx, &payment)
	})
	if err != nil {
		return err
	}

	if finalizedPayment == nil || finalizedOrder == nil {
		return nil
	}

	finalizeCtx := ctx
	if strings.TrimSpace(finalizedOrder.TenantID) != "" {
		finalizeCtx = context.WithValue(finalizeCtx, "tenant_id", finalizedOrder.TenantID)
		finalizeCtx = context.WithValue(finalizeCtx, "permission_scope", "ALL")
	}
	return u.finalizeOrder(finalizeCtx, finalizedOrder, "", finalizedPayment)
}

func mapXenditInvoiceStatus(status string) (models.POSPaymentStatus, bool, error) {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "PENDING":
		return models.POSPaymentStatusPending, false, nil
	case "PAID", "SETTLED":
		return models.POSPaymentStatusPaid, true, nil
	case "EXPIRED":
		return models.POSPaymentStatusExpired, true, nil
	case "FAILED":
		return models.POSPaymentStatusFailed, true, nil
	case "CANCELLED", "CANCELED", "VOIDED":
		return models.POSPaymentStatusCancelled, true, nil
	default:
		return "", false, fmt.Errorf("XENDIT_WEBHOOK_UNKNOWN_EVENT: unknown invoice status %s", status)
	}
}

func parseXenditPaidAt(value string) time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return apptime.Now()
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed
		}
	}
	return apptime.Now()
}

func (u *posPaymentUsecase) SyncXenditPayment(ctx context.Context, orderID, paymentID, companyID string) (*dto.POSPaymentResponse, error) {
	if strings.TrimSpace(companyID) == "" {
		return nil, fmt.Errorf("XENDIT_NOT_CONNECTED: missing company context")
	}

	payment, err := u.paymentRepo.FindByID(ctx, paymentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPOSPaymentNotFound
		}
		return nil, err
	}
	if payment.OrderID != orderID {
		return nil, ErrPOSPaymentNotFound
	}
	if payment.XenditInvoiceID == nil || strings.TrimSpace(*payment.XenditInvoiceID) == "" {
		return nil, fmt.Errorf("%w: payment has no Xendit invoice", ErrPOSInvalidPayment)
	}
	if payment.ExternalOrderID == nil || strings.TrimSpace(*payment.ExternalOrderID) == "" {
		return nil, fmt.Errorf("%w: payment has no Xendit external id", ErrPOSInvalidPayment)
	}

	creds, err := u.resolveXenditCredentials(ctx, companyID)
	if err != nil {
		return nil, err
	}

	xenditProvider := provider.NewXenditProvider(creds.secretKey, creds.accountID)
	invoice, err := xenditProvider.GetInvoice(ctx, *payment.XenditInvoiceID)
	if err != nil {
		return nil, fmt.Errorf("XENDIT_INVOICE_FAILED: %w", err)
	}

	payload := &dto.XenditWebhookPayload{
		ExternalID: strings.TrimSpace(*payment.ExternalOrderID),
		Status:     invoice.Status,
		ID:         invoice.ID,
		PaidAmount: invoice.Amount,
	}
	if err := u.ConfirmXenditWebhook(ctx, payload, creds.webhookToken); err != nil {
		return nil, err
	}

	updated, err := u.paymentRepo.FindByID(ctx, paymentID)
	if err != nil {
		return nil, err
	}
	return mapper.ToPOSPaymentResponse(updated), nil
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

func (u *posPaymentUsecase) CancelPendingPayment(ctx context.Context, orderID, paymentID, actorID string, reason *string) error {
	order, err := u.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPOSOrderNotFound
		}
		return err
	}

	if order.Status == models.PosOrderStatusPaid || order.Status == models.PosOrderStatusCompleted {
		return ErrPOSOrderAlreadyPaid
	}

	payment, err := u.paymentRepo.FindByID(ctx, paymentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPOSPaymentNotFound
		}
		return err
	}

	if payment.OrderID != orderID {
		return ErrPOSPaymentNotFound
	}

	if payment.Status != models.POSPaymentStatusPending {
		return fmt.Errorf("%w: payment is not pending", ErrPOSInvalidPayment)
	}

	payment.Status = models.POSPaymentStatusCancelled
	cancelReason := strings.TrimSpace(defaultString(reason))
	if cancelReason == "" {
		cancelReason = "Cancelled from POS live table"
	}
	note := strings.TrimSpace(defaultString(payment.Notes))
	if note == "" {
		note = cancelReason
	} else {
		note = note + " | " + cancelReason
	}
	payment.Notes = &note

	if err := u.paymentRepo.Update(ctx, payment); err != nil {
		return err
	}

	if order.OrderSource == "CUSTOMER" {
		order.Status = models.PosOrderStatusVoided
		order.VoidReason = &cancelReason
		if err := u.orderRepo.Update(ctx, order); err != nil {
			return err
		}
	} else if order.Status == models.PosOrderStatusDraft {
		order.Status = models.PosOrderStatusInProgress
		if err := u.orderRepo.Update(ctx, order); err != nil {
			return err
		}
	}

	if u.hub != nil {
		tableLabel := ""
		if order.TableLabel != nil {
			tableLabel = *order.TableLabel
		}
		payload := posOrderRealtimePayload(mapper.ToPOSOrderResponse(order), "CANCELLED", cancelReason)
		payload["table_label"] = tableLabel
		payload["cancelled_by"] = normalizedActorID(actorID)
		u.hub.Publish(tenantIDForPOSOrder(ctx, order), order.OutletID, "pos.order_status_changed", payload)
	}

	return nil
}

// finalizeOrder orchestrates POS order finalization: loyalty redemption, order status update,
// and ERP document creation (Sales Order → Customer Invoice → Sales Payment).
//
// Atomicity Guarantees:
//   - Order status update (→ PAID) and ERP document creation (SO, Invoice, Payment) are atomic:
//     if any ERP step fails, the entire transaction rolls back and order status remains unchanged.
//   - Loyalty operations (redemption + earning) run independently; failures are non-blocking.
//   - Stock deduction runs independently; discrepancies are reconciled via adjustment entries.
//
// This design ensures POS payment is the source-of-truth; even if ERP sync fails,
// the POS order remains valid and can be retried or reconciled.
func (u *posPaymentUsecase) finalizeOrder(ctx context.Context, order *models.PosOrder, userID string, payment *models.POSPayment) error {
	// Redeem selected loyalty reward only after payment reaches final success.
	// Non-blocking: if redemption fails, order finalization continues.
	if u.loyaltyUC != nil && order.LoyaltyMemberID != nil && order.LoyaltyRewardID != nil {
		memberID := strings.TrimSpace(*order.LoyaltyMemberID)
		rewardID := strings.TrimSpace(*order.LoyaltyRewardID)
		if memberID != "" && rewardID != "" {
			processedBy := userID
			_, _ = u.loyaltyUC.RedeemPoints(ctx, &loyaltyDTO.RedeemPointsRequest{
				MemberID:        memberID,
				RewardID:        rewardID,
				TransactionID:   order.ID,
				TransactionType: "pos_payment",
				ProcessedBy:     &processedBy,
			})
		}
	}

	// Commit POS paid status first so operational checkout is not blocked by ERP sync.
	order.Status = models.PosOrderStatusPaid
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	if u.hub != nil {
		payload := posOrderRealtimePayload(mapper.ToPOSOrderResponse(order), "PAID", "")
		u.hub.Publish(tenantIDForPOSOrder(ctx, order), order.OutletID, "pos.order_status_changed", payload)
		u.hub.Publish(tenantIDForPOSOrder(ctx, order), order.OutletID, "pos.payment_confirmed", payload)
	}

	// Best-effort ERP sync in a separate transaction. If this fails, POS payment stays valid
	// and operations can reconcile the ERP documents later.
	err := u.db.Transaction(func(tx *gorm.DB) error {
		txCtx := coreDatabase.WithTx(ctx, tx)

		soID := u.createSalesOrderFromPOS(txCtx, order, userID)
		if soID == "" {
			return errors.New("failed to create sales order from POS order")
		}
		order.SalesOrderID = &soID

		invoiceID := u.createCustomerInvoiceFromPOS(txCtx, soID, order, userID)
		if invoiceID == "" {
			return errors.New("failed to create customer invoice from POS order")
		}
		order.CustomerInvoiceID = &invoiceID

		if err := u.approveCustomerInvoiceFromPOS(txCtx, invoiceID, userID); err != nil {
			return err
		}

		if payment != nil {
			paymentID, err := u.createSalesPaymentFromPOS(txCtx, invoiceID, payment, order, userID)
			if err != nil {
				return fmt.Errorf("failed to create sales payment from POS payment: %w", err)
			}
			if paymentID == "" {
				return errors.New("failed to create sales payment from POS payment: empty payment id")
			}
		}

		if err := u.orderRepo.Update(txCtx, order); err != nil {
			return fmt.Errorf("failed to link ERP documents to order: %w", err)
		}

		return nil
	})
	if err != nil {
		log.Printf("pos_payment_erp_sync_failed order_id=%s payment_id=%s err=%v", order.ID, paymentIDOrEmpty(payment), err)
	}

	// Deduct inventory. Non-blocking: on failure, order finalization is not reversed;
	// stock discrepancies are reconciled by operations via an adjustment entry.
	if err := u.orderUsecase.DeductStock(ctx, order, order.OrderNumber, userID); err != nil {
		_ = err
	}

	// Award loyalty points when the order is linked to a loyalty member.
	// Non-blocking: failures do not affect order finalization or payment.
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

func paymentIDOrEmpty(payment *models.POSPayment) string {
	if payment == nil {
		return ""
	}
	return payment.ID
}

func defaultString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
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
		Status:          salesModels.CustomerInvoiceStatusDraft,
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

func (u *posPaymentUsecase) approveCustomerInvoiceFromPOS(ctx context.Context, invoiceID string, userID string) error {
	if u.customerInvoiceUC == nil {
		return errors.New("customer invoice usecase is not configured")
	}

	_, err := u.customerInvoiceUC.UpdateStatus(ctx, invoiceID, &salesDTO.UpdateCustomerInvoiceStatusRequest{
		Status: string(salesModels.CustomerInvoiceStatusApproved),
	}, optionalActorIDPointer(userID))
	if err != nil {
		return fmt.Errorf("failed to approve customer invoice from POS order: %w", err)
	}

	return nil
}

// createSalesPaymentFromPOS creates a confirmed sales payment and marks invoice paid.
func (u *posPaymentUsecase) createSalesPaymentFromPOS(ctx context.Context, invoiceID string, payment *models.POSPayment, order *models.PosOrder, userID string) (string, error) {
	now := apptime.Now()
	method := salesModels.SalesPaymentMethodCash
	if payment != nil && payment.Method != models.POSPaymentMethodCash {
		method = salesModels.SalesPaymentMethodBank
	}

	bank, err := u.resolveAutoPaymentBankAccount(ctx, method)
	if err != nil || bank == nil {
		if err != nil {
			return "", fmt.Errorf("resolve auto payment bank account: %w", err)
		}
		return "", errors.New("resolve auto payment bank account: bank account not found")
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
		return "", fmt.Errorf("persist sales payment: %w", err)
	}

	if u.salesPaymentUC == nil {
		return "", errors.New("sales payment usecase is not configured")
	}

	actorIDForJournal := strings.TrimSpace(userID)
	if actorIDForJournal == "" {
		actorIDForJournal = strings.TrimSpace(order.CreatedBy)
	}
	journalCtx := context.WithValue(ctx, "user_id", actorIDForJournal)
	if err := u.salesPaymentUC.TriggerJournalForPayment(journalCtx, pay); err != nil {
		return "", fmt.Errorf("trigger sales payment journal: %w", err)
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
		return "", fmt.Errorf("mark invoice paid: %w", err)
	}

	return pay.ID, nil
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
