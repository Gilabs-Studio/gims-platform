package handler

import (
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"encoding/json"

	"github.com/gilabs/gims/api/internal/auth/domain/usecase"
	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
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
	ID               string                 `json:"id"`          // Xendit invoice ID (used for recurring renewal lookup)
	ExternalID       string                 `json:"external_id"` // Set to pending-reg token for new registrations
	ReferenceID      string                 `json:"reference_id"`
	Event            string                 `json:"event"`
	Status           string                 `json:"status"` // "PAID", "EXPIRED", "SETTLED"
	Amount           int64                  `json:"amount"`
	PaidAmount       int64                  `json:"paid_amount"`
	PaymentSessionID string                 `json:"payment_session_id"`
	PaymentTokenID   string                 `json:"payment_token_id"`
	PaymentID        string                 `json:"payment_id"`
	PaymentRequestID string                 `json:"payment_request_id"`
	RecurringPlanID  string                 `json:"recurring_plan_id"`
	ActionID         string                 `json:"action_id"`
	Data             map[string]interface{} `json:"data"`
}

// InvoicePaid is called by Xendit when a payment invoice status changes.
// Xendit verifies the request by including the configured webhook token in the
// x-callback-token header. We verify it here before processing the payload.
//
// Route: POST /webhooks/xendit/invoice
func (h *XenditHandler) InvoicePaid(c *gin.Context) {
	// ── 1. Verify Xendit callback token ──────────────────────────────────────
	if config.AppConfig == nil || config.AppConfig.Xendit.BillingWebhookToken == "" {
		coreErrors.InternalServerErrorResponse(c, "webhook not configured")
		return
	}

	incomingToken := c.GetHeader("x-callback-token")
	if incomingToken != config.AppConfig.Xendit.BillingWebhookToken {
		c.Status(http.StatusUnauthorized)
		return
	}

	// ── 2. Parse body ─────────────────────────────────────────────────────────
	bodyBytes, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "cannot read request body")
		return
	}

	var payload xenditWebhookBody
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		coreErrors.ErrorResponse(c, "INVALID_PAYLOAD", nil, nil)
		return
	}
	payload.normalizeNestedData()

	if payload.isRefundEvent() {
		if payload.ID != "" {
			if err := h.authUC.HandlePaymentRefund(c.Request.Context(), payload.ID, payload.Status); err != nil {
				log.Printf("[xendit] failed refund adjustment invoice_id=%s status=%s: %v", payload.ID, payload.Status, err)
			}
		}
		response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
		return
	}

	if payload.isSubscriptionSetupEvent() {
		token := payload.registrationToken()
		if token == "" {
			coreErrors.ErrorResponse(c, "MISSING_REFERENCE_ID", nil, nil)
			return
		}
		recurringStatus := "pending_activation"
		if payload.normalizedEvent() == "recurring_plan.activated" {
			recurringStatus = "active"
		}
		if err := h.authUC.LinkRecurringSubscription(
			c.Request.Context(),
			token,
			payload.RecurringPlanID,
			payload.PaymentSessionID,
			payload.PaymentTokenID,
			recurringStatus,
		); err != nil && !errors.Is(err, usecase.ErrPendingRegistrationNotFound) {
			log.Printf("[xendit] failed recurring link event=%s reference_id=%s: %v", payload.Event, token, err)
		}
		response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
		return
	}

	if payload.isRecurringSuccessEvent() {
		identifier := payload.recurringIdentifier()
		if identifier == "" {
			coreErrors.ErrorResponse(c, "MISSING_RECURRING_IDENTIFIER", nil, nil)
			return
		}
		if token := payload.registrationToken(); token != "" {
			if err := h.authUC.CompletePendingRegistration(c.Request.Context(), token); err == nil {
				_ = h.authUC.LinkRecurringSubscription(
					c.Request.Context(),
					token,
					payload.RecurringPlanID,
					payload.PaymentSessionID,
					payload.PaymentTokenID,
					"active",
				)
				response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
				return
			} else if !errors.Is(err, usecase.ErrPendingRegistrationNotFound) {
				log.Printf("[xendit] failed recurring registration event=%s reference_id=%s: %v", payload.Event, token, err)
				response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
				return
			}
		}
		amountIDR := payload.effectiveAmount()
		if err := h.authUC.HandleRecurringRenewal(c.Request.Context(), identifier, amountIDR); err != nil {
			log.Printf("[xendit] failed recurring event=%s identifier=%s: %v", payload.Event, identifier, err)
			response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
			return
		}
		response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
		return
	}

	// Only act on PAID / SETTLED events — ignore EXPIRED and others.
	if payload.Status != "PAID" && payload.Status != "SETTLED" {
		response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
		return
	}

	if payload.ExternalID == "" {
		coreErrors.ErrorResponse(c, "MISSING_EXTERNAL_ID", nil, nil)
		return
	}

	// ── 3. Route by payload type ──────────────────────────────────────────────
	// Try completing a pending registration first. If Redis has no matching token
	// (e.g. this is a recurring renewal, not a new sign-up), fall back to the
	// renewal path using the Xendit invoice ID from the payload body.
	reqCtx := c.Request.Context()
	if err := h.authUC.CompletePendingRegistration(reqCtx, payload.ExternalID); err != nil {
		if errors.Is(err, usecase.ErrPendingRegistrationDataInvalid) {
			log.Printf("[xendit] invalid pending registration payload for external_id=%s: %v", payload.ExternalID, err)
		}

		if billingErr := h.authUC.CompletePendingBillingChange(reqCtx, payload.ExternalID); billingErr == nil {
			response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
			return
		} else if !errors.Is(billingErr, usecase.ErrPendingBillingChangeNotFound) && !errors.Is(billingErr, usecase.ErrPendingBillingChangeInvalid) {
			log.Printf("[xendit] failed billing change external_id=%s: %v", payload.ExternalID, billingErr)
			response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
			return
		}

		// No pending registration matched — treat as a recurring subscription renewal.
		if payload.ID != "" {
			amountIDR := payload.PaidAmount
			if amountIDR <= 0 {
				amountIDR = payload.Amount
			}
			if renewErr := h.authUC.HandleRecurringRenewal(reqCtx, payload.ID, amountIDR); renewErr != nil {
				log.Printf("[xendit] failed recurring renewal invoice_id=%s external_id=%s: %v", payload.ID, payload.ExternalID, renewErr)
				response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
				return
			}
			response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
			return
		}

		log.Printf("[xendit] failed pending registration external_id=%s: %v", payload.ExternalID, err)
		response.SuccessResponse(c, gin.H{"message": "event acknowledged"}, nil)
		return
	}

	response.SuccessResponse(c, gin.H{"message": "ok"}, nil)
}

func (p *xenditWebhookBody) normalizeNestedData() {
	if p.Data == nil {
		return
	}
	if p.ID == "" {
		p.ID = mapString(p.Data, "id")
	}
	if p.ExternalID == "" {
		p.ExternalID = mapString(p.Data, "external_id")
	}
	if p.ReferenceID == "" {
		p.ReferenceID = firstNonEmptyString(
			mapString(p.Data, "reference_id"),
			mapNestedString(p.Data, "metadata.tenant_registration_token"),
		)
	}
	if p.Status == "" {
		p.Status = mapString(p.Data, "status")
	}
	if p.PaymentSessionID == "" {
		p.PaymentSessionID = firstNonEmptyString(
			mapString(p.Data, "payment_session_id"),
			mapNestedString(p.Data, "payment_session.id"),
			mapNestedString(p.Data, "session.id"),
		)
	}
	if p.PaymentTokenID == "" {
		p.PaymentTokenID = firstNonEmptyString(
			mapString(p.Data, "payment_token_id"),
			mapNestedString(p.Data, "payment_token.id"),
		)
	}
	if p.PaymentID == "" {
		p.PaymentID = mapString(p.Data, "payment_id")
	}
	if p.PaymentRequestID == "" {
		p.PaymentRequestID = mapString(p.Data, "payment_request_id")
	}
	if p.RecurringPlanID == "" {
		p.RecurringPlanID = firstNonEmptyString(
			mapString(p.Data, "recurring_plan_id"),
			mapNestedString(p.Data, "recurring_plan.id"),
			mapNestedString(p.Data, "plan.id"),
		)
	}
	if p.ActionID == "" {
		p.ActionID = mapString(p.Data, "action_id")
	}
	if p.Amount == 0 {
		p.Amount = mapInt64(p.Data, "amount")
	}
	if p.PaidAmount == 0 {
		p.PaidAmount = mapInt64(p.Data, "paid_amount")
	}
}

func (p xenditWebhookBody) normalizedEvent() string {
	return strings.ToLower(strings.TrimSpace(p.Event))
}

func (p xenditWebhookBody) normalizedStatus() string {
	return strings.ToUpper(strings.TrimSpace(p.Status))
}

func (p xenditWebhookBody) isRefundEvent() bool {
	status := p.normalizedStatus()
	event := p.normalizedEvent()
	return status == "REFUNDED" || status == "CHARGEBACK" || event == "payment.refunded" || event == "payment.chargeback"
}

func (p xenditWebhookBody) isSubscriptionSetupEvent() bool {
	event := p.normalizedEvent()
	status := p.normalizedStatus()
	return event == "payment_session.completed" ||
		event == "recurring_plan.activated" ||
		(event == "" && status == "COMPLETED" && p.PaymentSessionID != "")
}

func (p xenditWebhookBody) isRecurringSuccessEvent() bool {
	event := p.normalizedEvent()
	status := p.normalizedStatus()
	return event == "recurring.cycle.succeeded" ||
		event == "recurring_cycle.succeeded" ||
		event == "payment.succeeded" ||
		status == "SUCCEEDED"
}

func (p xenditWebhookBody) registrationToken() string {
	if strings.TrimSpace(p.ReferenceID) != "" {
		return strings.TrimSpace(p.ReferenceID)
	}
	return strings.TrimSpace(p.ExternalID)
}

func (p xenditWebhookBody) recurringIdentifier() string {
	for _, candidate := range []string{
		p.ReferenceID,
		p.RecurringPlanID,
		p.PaymentSessionID,
		p.ExternalID,
		p.PaymentID,
		p.PaymentRequestID,
		p.ActionID,
		p.ID,
	} {
		if strings.TrimSpace(candidate) != "" {
			return strings.TrimSpace(candidate)
		}
	}
	return ""
}

func (p xenditWebhookBody) effectiveAmount() int64 {
	if p.PaidAmount > 0 {
		return p.PaidAmount
	}
	return p.Amount
}

func mapString(m map[string]interface{}, key string) string {
	if value, ok := m[key]; ok {
		if text, ok := value.(string); ok {
			return text
		}
	}
	return ""
}

func mapNestedString(m map[string]interface{}, path string) string {
	current := interface{}(m)
	for _, key := range strings.Split(path, ".") {
		node, ok := current.(map[string]interface{})
		if !ok {
			return ""
		}
		current, ok = node[key]
		if !ok {
			return ""
		}
	}
	text, _ := current.(string)
	return text
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func mapInt64(m map[string]interface{}, key string) int64 {
	value, ok := m[key]
	if !ok {
		return 0
	}
	switch typed := value.(type) {
	case float64:
		return int64(typed)
	case int64:
		return typed
	case int:
		return int64(typed)
	default:
		return 0
	}
}
