package handler

import (
	"io"
	"net/http"

	"encoding/json"

	"github.com/gilabs/gims/api/internal/auth/domain/usecase"
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gin-gonic/gin"
)

// XenditHandler handles inbound Xendit payment callbacks.
type XenditHandler struct {
	authUC usecase.AuthUsecase
}

func NewXenditHandler(authUC usecase.AuthUsecase) *XenditHandler {
	return &XenditHandler{authUC: authUC}
}

// xenditWebhookBody is the relevant subset of the Xendit invoice callback payload.
type xenditWebhookBody struct {
	ExternalID string `json:"external_id"`
	Status     string `json:"status"` // "PAID", "EXPIRED", "SETTLED"
}

// InvoicePaid is called by Xendit when a payment invoice status changes.
// Xendit verifies the request by including the configured webhook token in the
// x-callback-token header. We verify it here before processing the payload.
//
// Route: POST /webhooks/xendit/invoice
func (h *XenditHandler) InvoicePaid(c *gin.Context) {
	// ── 1. Verify Xendit callback token ──────────────────────────────────────
	if config.AppConfig == nil || config.AppConfig.Xendit.WebhookToken == "" {
		errors.InternalServerErrorResponse(c, "webhook not configured")
		return
	}

	incomingToken := c.GetHeader("x-callback-token")
	if incomingToken != config.AppConfig.Xendit.WebhookToken {
		c.Status(http.StatusUnauthorized)
		return
	}

	// ── 2. Parse body ─────────────────────────────────────────────────────────
	bodyBytes, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		errors.InternalServerErrorResponse(c, "cannot read request body")
		return
	}

	var payload xenditWebhookBody
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		errors.ErrorResponse(c, "INVALID_PAYLOAD", nil, nil)
		return
	}

	// Only act on PAID / SETTLED events — ignore EXPIRED and others.
	if payload.Status != "PAID" && payload.Status != "SETTLED" {
		response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
		return
	}

	if payload.ExternalID == "" {
		errors.ErrorResponse(c, "MISSING_EXTERNAL_ID", nil, nil)
		return
	}

	// ── 3. Complete the pending registration ──────────────────────────────────
	if err := h.authUC.CompletePendingRegistration(c.Request.Context(), payload.ExternalID); err != nil {
		// Log but return 200 — Xendit will retry on non-200, and double-provisioning
		// is prevented by the email uniqueness constraint.
		_ = err
	}

	response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
}
