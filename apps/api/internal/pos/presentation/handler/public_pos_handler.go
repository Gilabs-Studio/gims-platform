package handler

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/usecase"
	"github.com/gin-gonic/gin"
)

// PublicPOSHandler handles unauthenticated customer self-order endpoints.
type PublicPOSHandler struct {
	uc usecase.PublicPOSUsecase
}

// NewPublicPOSHandler creates a PublicPOSHandler.
func NewPublicPOSHandler(uc usecase.PublicPOSUsecase) *PublicPOSHandler {
	return &PublicPOSHandler{uc: uc}
}

// GetTableInfo resolves a QR token and returns the menu + outlet info.
func (h *PublicPOSHandler) GetTableInfo(c *gin.Context) {
	token := c.Param("token")
	info, err := h.uc.GetTableInfo(c.Request.Context(), token)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}
	response.SuccessResponse(c, info, nil)
}

// CreateCustomerOrder places a new self-order for the customer.
func (h *PublicPOSHandler) CreateCustomerOrder(c *gin.Context) {
	token := c.Param("token")

	var req dto.CreateCustomerOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}

	order, err := h.uc.CreateCustomerOrder(c.Request.Context(), token, &req)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": order})
}

// GetOrderStatus returns the current status of a customer order.
func (h *PublicPOSHandler) GetOrderStatus(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")

	order, err := h.uc.GetOrderStatus(c.Request.Context(), token, orderID)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}
	response.SuccessResponse(c, order, nil)
}

// InitiateDigitalPayment creates a Xendit invoice for a customer order.
func (h *PublicPOSHandler) InitiateDigitalPayment(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")

	var req dto.InitiateCustomerPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.HandleValidationError(c, err)
		return
	}
	successRedirect, failureRedirect := buildSelfOrderPaymentRedirectURLs(c, token, orderID, req.SuccessRedirectURL, req.FailureRedirectURL)
	req.SuccessRedirectURL = &successRedirect
	req.FailureRedirectURL = &failureRedirect

	result, err := h.uc.InitiateDigitalPayment(c.Request.Context(), token, orderID, &req)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}
	response.SuccessResponse(c, result, nil)
}

// ConfirmDigitalPaymentRedirect verifies payment status after Xendit redirects the browser
// back to self-order. This mirrors register success confirmation and covers delayed webhooks.
func (h *PublicPOSHandler) ConfirmDigitalPaymentRedirect(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")
	paymentID := c.Param("paymentId")

	result, err := h.uc.ConfirmDigitalPaymentRedirect(c.Request.Context(), token, orderID, paymentID)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}
	response.SuccessResponse(c, result, nil)
}

// MarkPayAtCashier acknowledges that the customer will pay at the counter.
func (h *PublicPOSHandler) MarkPayAtCashier(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")

	order, err := h.uc.MarkPayAtCashier(c.Request.Context(), token, orderID)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{
		"acknowledged": true,
		"order":        order,
	}, nil)
}

// CancelCustomerOrder allows a customer to cancel their own un-processed order.
func (h *PublicPOSHandler) CancelCustomerOrder(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")

	order, err := h.uc.CancelCustomerOrder(c.Request.Context(), token, orderID)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{
		"cancelled": true,
		"order":     order,
	}, nil)
}

// CancelDigitalPayment cancels a pending digital invoice and falls back to cashier payment mode.
func (h *PublicPOSHandler) CancelDigitalPayment(c *gin.Context) {
	token := c.Param("token")
	orderID := c.Param("orderId")
	paymentID := c.Param("paymentId")

	order, err := h.uc.CancelDigitalPayment(c.Request.Context(), token, orderID, paymentID)
	if err != nil {
		handlePublicPOSError(c, err)
		return
	}

	response.SuccessResponse(c, gin.H{
		"cancelled": true,
		"order":     order,
	}, nil)
}

func buildSelfOrderPaymentRedirectURLs(c *gin.Context, token, orderID string, requestedSuccess, requestedFailure *string) (string, string) {
	if requestedSuccess != nil && strings.TrimSpace(*requestedSuccess) != "" {
		success := withSelfOrderPaymentQuery(strings.TrimSpace(*requestedSuccess), orderID, "success")
		failedBase := success
		if requestedFailure != nil && strings.TrimSpace(*requestedFailure) != "" {
			failedBase = strings.TrimSpace(*requestedFailure)
		}
		return success, withSelfOrderPaymentQuery(failedBase, orderID, "failed")
	}

	base := strings.TrimSpace(c.GetHeader("Referer"))
	if base == "" {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		if origin == "" && config.AppConfig != nil {
			origin = strings.TrimRight(config.AppConfig.Server.FrontendBaseURL, "/")
		}
		base = strings.TrimRight(origin, "/") + "/id/pos/" + url.PathEscape(token)
	}

	success := withSelfOrderPaymentQuery(base, orderID, "success")
	failed := withSelfOrderPaymentQuery(base, orderID, "failed")
	return success, failed
}

func withSelfOrderPaymentQuery(base, orderID, status string) string {
	parsed, err := url.Parse(base)
	if err != nil {
		return base
	}
	query := parsed.Query()
	query.Set("order_id", orderID)
	query.Set("payment_status", status)
	parsed.RawQuery = query.Encode()
	parsed.Fragment = ""
	return parsed.String()
}

// handlePublicPOSError maps public-facing errors to HTTP responses.
func handlePublicPOSError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, usecase.ErrPublicTokenInvalid):
		coreErrors.NotFoundResponse(c, "qr_token", "")
	case errors.Is(err, usecase.ErrPOSOrderNotFound):
		coreErrors.NotFoundResponse(c, "pos_order", "")
	case errors.Is(err, usecase.ErrPOSPaymentNotFound):
		coreErrors.NotFoundResponse(c, "pos_payment", "")
	case errors.Is(err, usecase.ErrPOSOutletForbidden):
		coreErrors.NotFoundResponse(c, "pos_order", "")
	case errors.Is(err, usecase.ErrPOSOrderAlreadyPaid):
		coreErrors.ErrorResponse(c, "POS_ORDER_ALREADY_PAID", nil, nil)
	case errors.Is(err, usecase.ErrPOSOrderCannotModify):
		coreErrors.ErrorResponse(c, "POS_ORDER_CANNOT_MODIFY", nil, nil)
	case errors.Is(err, usecase.ErrPOSProductNotAvailable):
		coreErrors.ErrorResponse(c, "POS_PRODUCT_NOT_AVAILABLE", nil, nil)
	case errors.Is(err, usecase.ErrPOSInsufficientStock):
		coreErrors.ErrorResponse(c, "INSUFFICIENT_STOCK", nil, nil)
	case errors.Is(err, usecase.ErrPOSInvalidPayment):
		coreErrors.ErrorResponse(c, "POS_INSUFFICIENT_PAYMENT", nil, nil)
	case strings.HasPrefix(err.Error(), "XENDIT_NOT_CONNECTED:"):
		coreErrors.ErrorResponse(c, "XENDIT_NOT_CONNECTED", map[string]interface{}{"reason": "Payment gateway is not available"}, nil)
	case strings.HasPrefix(err.Error(), "XENDIT_INVOICE_FAILED:"):
		coreErrors.ErrorResponse(c, "XENDIT_INVOICE_FAILED", map[string]interface{}{"reason": "Failed to create digital payment invoice"}, nil)
	default:
		coreErrors.InternalServerErrorResponse(c, "")
	}
}
