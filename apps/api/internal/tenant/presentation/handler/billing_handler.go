package handler

import (
	"context"
	"errors"
	"strings"

	authUsecase "github.com/gilabs/gims/api/internal/auth/domain/usecase"
	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/response"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	tenantDTO "github.com/gilabs/gims/api/internal/tenant/domain/dto"
	tenantPolicy "github.com/gilabs/gims/api/internal/tenant/domain/policy"
	tenantUsecase "github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	"github.com/gin-gonic/gin"
)

// BillingHandler exposes subscription and entitlement information to authenticated tenant users.
type BillingHandler struct {
	subUC           tenantUsecase.SubscriptionUsecase
	paymentTxnUC    tenantUsecase.PaymentTransactionUsecase
	planRepo        tenantRepos.SubscriptionPlanRepository
	billingChangeUC billingChangeUsecase
}

type billingChangeUsecase interface {
	CreateBillingChangeInvoice(ctx context.Context, req *tenantDTO.BillingChangeRequest, tenantID string) (*tenantDTO.BillingChangeResponse, error)
}

const missingTenantContextMessage = "missing tenant context"

type planPermissionEntitlementRow struct {
	PermissionCode string
	MenuURL        string
}

// NewBillingHandler creates a BillingHandler.
func NewBillingHandler(subUC tenantUsecase.SubscriptionUsecase, paymentTxnUC tenantUsecase.PaymentTransactionUsecase, planRepo tenantRepos.SubscriptionPlanRepository, billingChangeUC billingChangeUsecase) *BillingHandler {
	return &BillingHandler{subUC: subUC, paymentTxnUC: paymentTxnUC, planRepo: planRepo, billingChangeUC: billingChangeUC}
}

// GetMySubscription returns the active subscription for the calling tenant.
//
// GET /api/v1/billing/subscription
func (h *BillingHandler) GetMySubscription(c *gin.Context) {
	tenantID, ok := c.Get("tenant_id")
	if !ok || tenantID == "" {
		coreErrors.UnauthorizedResponse(c, missingTenantContextMessage)
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
		coreErrors.UnauthorizedResponse(c, missingTenantContextMessage)
		return
	}
	tenantIDStr := tenantID.(string)

	modules, err := h.planRepo.GetEnabledModulesForTenant(c.Request.Context(), tenantIDStr)
	if err != nil {
		// Return empty list on error — frontend degrades gracefully without blocking.
		modules = []string{}
	}

	menuURLs, permissionCodes := h.loadPlanPermissionEntitlements(c.Request.Context(), tenantIDStr)
	alwaysAccessibleMenuURLs := h.loadAlwaysAccessibleMenuURLs(c.Request.Context())

	if len(alwaysAccessibleMenuURLs) > 0 {
		seenMenus := make(map[string]struct{}, len(menuURLs)+len(alwaysAccessibleMenuURLs))
		merged := make([]string, 0, len(menuURLs)+len(alwaysAccessibleMenuURLs))

		for _, menuURL := range menuURLs {
			if _, exists := seenMenus[menuURL]; exists {
				continue
			}
			seenMenus[menuURL] = struct{}{}
			merged = append(merged, menuURL)
		}

		for _, menuURL := range alwaysAccessibleMenuURLs {
			if _, exists := seenMenus[menuURL]; exists {
				continue
			}
			seenMenus[menuURL] = struct{}{}
			merged = append(merged, menuURL)
		}

		menuURLs = merged
	}

	response.SuccessResponse(c, gin.H{
		"modules":          modules,
		"menu_urls":        menuURLs,
		"permission_codes": permissionCodes,
	}, nil)
}

func (h *BillingHandler) loadPlanPermissionEntitlements(ctx context.Context, tenantID string) ([]string, []string) {
	menuURLs := make([]string, 0)
	permissionCodes := make([]string, 0)

	sub, err := h.subUC.GetActiveByTenant(ctx, tenantID)
	if err != nil || sub == nil {
		return menuURLs, permissionCodes
	}

	rows, err := h.listPlanPermissionEntitlementRows(ctx, sub.Plan)
	if err != nil {
		return menuURLs, permissionCodes
	}

	seenMenus := map[string]struct{}{}
	seenCodes := map[string]struct{}{}
	for _, row := range rows {
		menu := strings.ToLower(strings.TrimSpace(row.MenuURL))
		if menu != "" {
			if _, exists := seenMenus[menu]; !exists {
				seenMenus[menu] = struct{}{}
				menuURLs = append(menuURLs, menu)
			}
		}

		code := strings.ToLower(strings.TrimSpace(row.PermissionCode))
		if code != "" {
			if _, exists := seenCodes[code]; !exists {
				seenCodes[code] = struct{}{}
				permissionCodes = append(permissionCodes, code)
			}
		}
	}

	return menuURLs, permissionCodes
}

func (h *BillingHandler) listPlanPermissionEntitlementRows(ctx context.Context, planSlug string) ([]planPermissionEntitlementRow, error) {
	rows := make([]planPermissionEntitlementRow, 0)
	err := database.DB.WithContext(ctx).
		Table("plan_permission_entitlements").
		Select("permission_code, menu_url").
		Where("plan_slug = ? AND is_enabled = true", normalizePlanSlugKey(planSlug)).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	defaultRows := tenantPolicy.DefaultPlanEntitlementRows(planSlug)
	if len(defaultRows) > 0 {
		merged := make([]planPermissionEntitlementRow, 0, len(rows)+len(defaultRows))
		merged = append(merged, rows...)
		for _, row := range defaultRows {
			merged = append(merged, planPermissionEntitlementRow{
				PermissionCode: row.PermissionCode,
				MenuURL:        row.MenuURL,
			})
		}
		rows = merged
	}
	return rows, nil
}

func (h *BillingHandler) loadAlwaysAccessibleMenuURLs(ctx context.Context) []string {
	_ = ctx
	// Keep baseline minimal and deterministic to avoid accidental global unlocks
	// when access flags are stale/mis-seeded in DB.
	return []string{"/dashboard"}
}

func normalizePlanSlugKey(planSlug string) string {
	normalized := strings.ToLower(strings.TrimSpace(planSlug))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	return normalized
}

// GetMyPaymentHistory returns the payment history for the calling tenant.
//
// GET /api/v1/billing/payment-history
func (h *BillingHandler) GetMyPaymentHistory(c *gin.Context) {
	tenantID, ok := c.Get("tenant_id")
	if !ok || tenantID == "" {
		coreErrors.UnauthorizedResponse(c, missingTenantContextMessage)
		return
	}

	var params tenantDTO.PaymentHistoryListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		coreErrors.InvalidRequestBodyResponse(c)
		return
	}

	payments, pagination, err := h.paymentTxnUC.ListByTenant(c.Request.Context(), tenantID.(string), params)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, "failed to load payment history")
		return
	}

	meta := &response.Meta{Pagination: pagination}
	response.SuccessResponse(c, gin.H{
		"data": payments,
	}, meta)
}

// ChangeSubscription handles seat-limit increases and plan upgrades.
// POST /api/v1/billing/change
func (h *BillingHandler) ChangeSubscription(c *gin.Context) {
	tenantID, ok := c.Get("tenant_id")
	if !ok || tenantID == "" {
		coreErrors.UnauthorizedResponse(c, missingTenantContextMessage)
		return
	}
	if !isBillingOwnerRole(c) {
		coreErrors.ForbiddenResponse(c, "billing.change", nil)
		return
	}

	var req tenantDTO.BillingChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		coreErrors.InvalidRequestBodyResponse(c)
		return
	}

	if h.billingChangeUC == nil {
		coreErrors.InternalServerErrorResponse(c, "billing change service unavailable")
		return
	}

	resp, err := h.billingChangeUC.CreateBillingChangeInvoice(c.Request.Context(), &req, tenantID.(string))
	if err != nil {
		if errors.Is(err, authUsecase.ErrSeatLimitExceeded) {
			coreErrors.ErrorResponse(c, "SEAT_LIMIT_EXCEEDED", map[string]any{"reason": err.Error()}, nil)
			return
		}
		if strings.EqualFold(err.Error(), "COUPON_INVALID") {
			coreErrors.ErrorResponse(c, "COUPON_INVALID", map[string]any{"reason": "Coupon expired, used, or invalid"}, nil)
			return
		}
		if errors.Is(err, authUsecase.ErrBillingChangeUnsupported) {
			coreErrors.ErrorResponse(c, "UNSUPPORTED_BILLING_CHANGE", map[string]any{"reason": err.Error()}, nil)
			return
		}
		if errors.Is(err, authUsecase.ErrPaymentGatewayUnavailable) {
			coreErrors.InternalServerErrorResponse(c, "payment gateway unavailable")
			return
		}
		coreErrors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func isBillingOwnerRole(c *gin.Context) bool {
	roleValue, ok := c.Get("user_role")
	if !ok {
		return false
	}
	role := strings.ToLower(strings.TrimSpace(roleValue.(string)))
	return strings.HasPrefix(role, "tenant_owner_") || role == "owner" || strings.HasSuffix(role, "_owner")
}
