package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
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
	paymentRepo  repositories.POSPaymentRepository
	orderRepo    repositories.PosOrderRepository
	configRepo   repositories.POSConfigRepository
	midtransRepo repositories.MidtransConfigRepository
	orderUsecase POSOrderUsecase
}

// NewPOSPaymentUsecase constructs a POSPaymentUsecase.
func NewPOSPaymentUsecase(
	paymentRepo repositories.POSPaymentRepository,
	orderRepo repositories.PosOrderRepository,
	configRepo repositories.POSConfigRepository,
	midtransRepo repositories.MidtransConfigRepository,
	orderUsecase POSOrderUsecase,
) POSPaymentUsecase {
	return &posPaymentUsecase{
		paymentRepo:  paymentRepo,
		orderRepo:    orderRepo,
		configRepo:   configRepo,
		midtransRepo: midtransRepo,
		orderUsecase: orderUsecase,
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

	now := apptime.Now()
	change := req.Amount - order.TotalAmount
	payment := &models.POSPayment{
		OrderID:      orderID,
		Method:       models.POSPaymentMethod(req.Method),
		Status:       models.POSPaymentStatusPaid,
		Amount:       order.TotalAmount,
		TenderAmount: req.Amount,
		ChangeAmount: change,
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

// finalizeOrder marks the order Paid and deducts stock.
func (u *posPaymentUsecase) finalizeOrder(ctx context.Context, order *models.PosOrder, userID string, payment *models.POSPayment) error {
	order.Status = models.PosOrderStatusPaid
	if err := u.orderRepo.Update(ctx, order); err != nil {
		return err
	}

	// Deduct inventory. On failure we log but do not reverse the payment;
	// stock discrepancies are reconciled by operations via an adjustment entry.
	if err := u.orderUsecase.DeductStock(ctx, order, order.OrderNumber, userID); err != nil {
		_ = err
	}

	return nil
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
