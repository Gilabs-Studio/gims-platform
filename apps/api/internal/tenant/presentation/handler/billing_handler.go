package handler

import (
	"errors"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	tenantUsecase "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	"github.com/gin-gonic/gin"
)

// BillingHandler exposes subscription and entitlement information to authenticated tenant users.
type BillingHandler struct {
	subUC    tenantUsecase.SubscriptionUsecase
	planRepo tenantRepos.SubscriptionPlanRepository
}

// NewBillingHandler creates a BillingHandler.
func NewBillingHandler(subUC tenantUsecase.SubscriptionUsecase, planRepo tenantRepos.SubscriptionPlanRepository) *BillingHandler {
	return &BillingHandler{subUC: subUC, planRepo: planRepo}
}

// GetMySubscription returns the active subscription for the calling tenant.
//
// GET /api/v1/billing/subscription
func (h *BillingHandler) GetMySubscription(c *gin.Context) {
	tenantID, ok := c.Get("tenant_id")
	if !ok || tenantID == "" {
		coreErrors.UnauthorizedResponse(c, "missing tenant context")
		return
	}

	sub, err := h.subUC.GetActiveByTenant(c.Request.Context(), tenantID.(string))
	if err != nil {
		if errors.Is(err, tenantUsecase.ErrSubscriptionNotFound) {
			response.SuccessResponse(c, nil, nil)
			return
		}
		coreErrors.InternalServerErrorResponse(c, "failed to load subscription")
		return
	}

	response.SuccessResponse(c, sub, nil)
}

// GetMyEntitlements returns the list of module slugs the calling tenant is entitled to.
//
// GET /api/v1/billing/entitlements
func (h *BillingHandler) GetMyEntitlements(c *gin.Context) {
	tenantID, ok := c.Get("tenant_id")
	if !ok || tenantID == "" {
		coreErrors.UnauthorizedResponse(c, "missing tenant context")
		return
	}

	modules, err := h.planRepo.GetEnabledModulesForTenant(c.Request.Context(), tenantID.(string))
	if err != nil {
		// Return empty list on error — frontend degrades gracefully without blocking.
		modules = []string{}
	}

	response.SuccessResponse(c, gin.H{"modules": modules}, nil)
}
