package usecase

import (
	"context"
	"errors"
	"time"

	orgRepos "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
)

// ErrPublicTokenInvalid is returned when the scanned QR token does not match any active record.
var ErrPublicTokenInvalid = errors.New("invalid or expired QR token")

// ErrPublicOutletClosed is returned when the customer attempts to order but no POS session is open.
var ErrPublicOutletClosed = errors.New("restaurant is currently closed")

// PublicPOSUsecase handles customer-facing self-order operations.
type PublicPOSUsecase interface {
	// GetTableInfo resolves a QR token and returns the table + menu payload.
	GetTableInfo(ctx context.Context, token string) (*dto.PublicTableInfoResponse, error)
	// CreateCustomerOrder places a new order on behalf of a customer.
	// Returns the simplified order response and publishes a WS event.
	CreateCustomerOrder(ctx context.Context, token string, req *dto.CreateCustomerOrderRequest) (*dto.CustomerOrderResponse, error)
	// GetOrderStatus returns the current status and totals for a customer order.
	GetOrderStatus(ctx context.Context, token, orderID string) (*dto.CustomerOrderResponse, error)
	// InitiateDigitalPayment creates a Xendit payment invoice for a customer order.
	InitiateDigitalPayment(ctx context.Context, token, orderID string, req *dto.InitiateCustomerPaymentRequest) (*dto.POSPaymentResponse, error)
}

// POSHubPublisher is a narrow interface used by this usecase to broadcast WS events.
// It avoids an import cycle with the ws infrastructure package.
type POSHubPublisher interface {
	Publish(outletID string, eventType string, payload map[string]interface{})
}

type publicPOSUsecase struct {
	qrTokenRepo repositories.TableQRTokenRepository
	sessionRepo repositories.PosSessionRepository
	orderUC     POSOrderUsecase
	paymentUC   POSPaymentUsecase
	configRepo  repositories.POSConfigRepository
	outletRepo  orgRepos.OutletRepository
	hub         POSHubPublisher
}

// NewPublicPOSUsecase creates a PublicPOSUsecase.
// hub may be nil to disable WebSocket broadcasts (useful in tests).
func NewPublicPOSUsecase(
	qrTokenRepo repositories.TableQRTokenRepository,
	sessionRepo repositories.PosSessionRepository,
	orderUC POSOrderUsecase,
	paymentUC POSPaymentUsecase,
	configRepo repositories.POSConfigRepository,
	outletRepo orgRepos.OutletRepository,
	hub POSHubPublisher,
) PublicPOSUsecase {
	return &publicPOSUsecase{
		qrTokenRepo: qrTokenRepo,
		sessionRepo: sessionRepo,
		orderUC:     orderUC,
		paymentUC:   paymentUC,
		configRepo:  configRepo,
		outletRepo:  outletRepo,
		hub:         hub,
	}
}

// ─── GetTableInfo ─────────────────────────────────────────────────────────────

func (u *publicPOSUsecase) GetTableInfo(ctx context.Context, token string) (*dto.PublicTableInfoResponse, error) {
	qr, err := u.qrTokenRepo.FindByToken(ctx, token)
	if err != nil || qr == nil || !qr.IsActive {
		return nil, ErrPublicTokenInvalid
	}

	outlet, err := u.outletRepo.GetByID(ctx, qr.OutletID)
	if err != nil || outlet == nil {
		return nil, ErrPublicTokenInvalid
	}

	_, sessionErr := u.sessionRepo.FindActiveByOutlet(ctx, qr.OutletID)
	isOpen := sessionErr == nil

	catalog, _ := u.orderUC.GetCatalog(ctx, qr.OutletID)
	if catalog == nil {
		catalog = []dto.POSCatalogItem{}
	}

	config, _ := u.configRepo.FindByOutletID(ctx, qr.OutletID)
	pubConfig := dto.PublicPOSConfig{Currency: "IDR"}
	if config != nil {
		pubConfig.TaxRate = config.TaxRate
		pubConfig.ServiceChargeRate = config.ServiceChargeRate
		pubConfig.Currency = config.Currency
	}

	return &dto.PublicTableInfoResponse{
		OutletID:   qr.OutletID,
		OutletName: outlet.Name,
		TableLabel: qr.TableLabel,
		Token:      token,
		IsOpen:     isOpen,
		Catalog:    catalog,
		Config:     pubConfig,
	}, nil
}

// ─── CreateCustomerOrder ──────────────────────────────────────────────────────

func (u *publicPOSUsecase) CreateCustomerOrder(ctx context.Context, token string, req *dto.CreateCustomerOrderRequest) (*dto.CustomerOrderResponse, error) {
	qr, err := u.qrTokenRepo.FindByToken(ctx, token)
	if err != nil || qr == nil || !qr.IsActive {
		return nil, ErrPublicTokenInvalid
	}

	// Require an active session — customer cannot order when outlet is closed.
	if _, err := u.sessionRepo.FindActiveByOutlet(ctx, qr.OutletID); err != nil {
		return nil, ErrPublicOutletClosed
	}

	// Build a staff-compatible CreateOrderRequest with OrderSource overridden inside usecase.
	tableObjectID := qr.TableObjectID
	tableLabel := qr.TableLabel
	createReq := &dto.CreateOrderRequest{
		OutletID:     qr.OutletID,
		OrderType:    "DINE_IN",
		TableID:      &tableObjectID,
		TableLabel:   &tableLabel,
		CustomerName: &req.CustomerName,
		Notes:        req.Notes,
	}
	order, err := u.orderUC.Create(ctx, createReq, "customer")
	if err != nil {
		return nil, err
	}

	// Attach each item from the cart.
	for _, item := range req.Items {
		pid := item.ProductID
		qty := item.Quantity
		addReq := &dto.AddOrderItemRequest{ProductID: pid, Quantity: qty, Notes: item.Notes}
		if _, err := u.orderUC.AddItem(ctx, order.ID, addReq); err != nil {
			return nil, err
		}
	}

	// Re-fetch to get updated totals after all items.
	updated, err := u.orderUC.GetByID(ctx, order.ID)
	if err != nil {
		return nil, err
	}

	// Broadcast WS event so staff dashboard refreshes instantly.
	if u.hub != nil {
		u.hub.Publish(qr.OutletID, "pos.new_customer_order", map[string]interface{}{
			"order_id":     updated.ID,
			"order_number": updated.OrderNumber,
			"table_label":  tableLabel,
			"customer":     req.CustomerName,
			"total_amount": updated.TotalAmount,
		})
	}

	return toCustomerOrderResponse(updated, tableLabel), nil
}

// ─── GetOrderStatus ───────────────────────────────────────────────────────────

func (u *publicPOSUsecase) GetOrderStatus(ctx context.Context, token, orderID string) (*dto.CustomerOrderResponse, error) {
	qr, err := u.qrTokenRepo.FindByToken(ctx, token)
	if err != nil || qr == nil || !qr.IsActive {
		return nil, ErrPublicTokenInvalid
	}

	order, err := u.orderUC.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Ensure the order belongs to this outlet (IDOR guard).
	if order.OutletID != qr.OutletID {
		return nil, ErrPublicTokenInvalid
	}

	tableLabel := qr.TableLabel
	if order.TableLabel != nil {
		tableLabel = *order.TableLabel
	}

	return toCustomerOrderResponse(order, tableLabel), nil
}

// ─── InitiateDigitalPayment ───────────────────────────────────────────────────

func (u *publicPOSUsecase) InitiateDigitalPayment(ctx context.Context, token, orderID string, req *dto.InitiateCustomerPaymentRequest) (*dto.POSPaymentResponse, error) {
	qr, err := u.qrTokenRepo.FindByToken(ctx, token)
	if err != nil || qr == nil || !qr.IsActive {
		return nil, ErrPublicTokenInvalid
	}

	order, err := u.orderUC.GetByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// IDOR guard: order must belong to the outlet encoded in the token.
	if order.OutletID != qr.OutletID {
		return nil, ErrPublicTokenInvalid
	}

	outlet, err := u.outletRepo.GetByID(ctx, qr.OutletID)
	if err != nil || outlet == nil {
		return nil, ErrPublicTokenInvalid
	}

	payReq := &dto.ProcessPaymentRequest{
		Method:      req.Method,
		Amount:      req.Amount,
		ChannelCode: req.ChannelCode,
	}

	// Use a "customer" cashier ID — the payment usecase requires a non-empty value.
	companyID := ""
	if outlet.CompanyID != nil {
		companyID = *outlet.CompanyID
	}
	return u.paymentUC.InitiateDigitalPayment(ctx, orderID, payReq, "customer", companyID)
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func toCustomerOrderResponse(order *dto.POSOrderResponse, tableLabel string) *dto.CustomerOrderResponse {
	return &dto.CustomerOrderResponse{
		OrderID:     order.ID,
		OrderNumber: order.OrderNumber,
		TableLabel:  tableLabel,
		Status:      order.Status,
		Subtotal:    order.Subtotal,
		TaxAmount:   order.TaxAmount,
		TotalAmount: order.TotalAmount,
		Items:       order.Items,
		CreatedAt:   order.CreatedAt.Format(time.RFC3339),
	}
}
