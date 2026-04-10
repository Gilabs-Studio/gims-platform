package handler

import (
	"errors"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gin-gonic/gin"
)

// POSPaymentHandler handles POS payment processing
type POSPaymentHandler struct {
	uc usecase.POSPaymentUsecase
}

// NewPOSPaymentHandler creates the handler
func NewPOSPaymentHandler(uc usecase.POSPaymentUsecase) *POSPaymentHandler {
	return &POSPaymentHandler{uc: uc}
}

func getOrderIDParam(c *gin.Context) string {
	if orderID := c.Param("orderID"); orderID != "" {
		return orderID
	}
	return c.Param("id")
}

// ProcessCash processes an immediate cash or card payment
func (h *POSPaymentHandler) ProcessCash(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	orderID := getOrderIDParam(c)
	var req dto.ProcessPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	payment, err := h.uc.ProcessCash(c.Request.Context(), orderID, &req, uc.userID)
	if err != nil {
		handlePOSPaymentError(c, err)
		return
	}
	response.SuccessResponse(c, payment, nil)
}

// InitiateMidtrans creates a Midtrans payment charge
func (h *POSPaymentHandler) InitiateMidtrans(c *gin.Context) {
	uc, ok := extractUserContext(c)
	if !ok {
		return
	}

	orderID := getOrderIDParam(c)
	var req dto.ProcessPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	payment, err := h.uc.InitiateMidtrans(c.Request.Context(), orderID, &req, uc.userID, uc.companyID)
	if err != nil {
		handlePOSPaymentError(c, err)
		return
	}
	response.SuccessResponse(c, payment, nil)
}

// GetByOrder returns all payments for an order
func (h *POSPaymentHandler) GetByOrder(c *gin.Context) {
	payments, err := h.uc.GetByOrderID(c.Request.Context(), getOrderIDParam(c))
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, payments, nil)
}

// MidtransWebhook handles server-to-server callbacks from Midtrans
// This endpoint must NOT require authentication — Midtrans calls it directly.
func (h *POSPaymentHandler) MidtransWebhook(c *gin.Context) {
	var payload dto.MidtransCallbackPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	// TODO: verify Midtrans signature using webhook secret from midtrans config
	if err := h.uc.ConfirmMidtransWebhook(c.Request.Context(), &payload); err != nil {
		coreErrors.InternalServerErrorResponse(c, "")
		return
	}
	response.SuccessResponse(c, gin.H{"status": "ok"}, nil)
}

func handlePOSPaymentError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, usecase.ErrPOSOrderNotFound):
		coreErrors.NotFoundResponse(c, "pos_order", "")
	case errors.Is(err, usecase.ErrPOSOrderAlreadyPaid):
		coreErrors.ErrorResponse(c, "POS_ORDER_ALREADY_PAID", nil, nil)
	case errors.Is(err, usecase.ErrPOSInvalidPayment):
		coreErrors.ErrorResponse(c, "POS_INSUFFICIENT_PAYMENT", nil, nil)
	default:
		coreErrors.InternalServerErrorResponse(c, "")
	}
}
