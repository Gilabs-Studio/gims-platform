package handler

import (
	"net/http"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
	"github.com/gilabs/gims/api/internal/tenant/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// SystemAdminHandler handles system admin HTTP requests.
type SystemAdminHandler struct {
	sysAdminUC usecase.SystemAdminUsecase
	tenantUC   usecase.TenantUsecase
	couponUC   usecase.CouponUsecase
	subUC      usecase.SubscriptionUsecase
}

// NewSystemAdminHandler creates a new SystemAdminHandler.
func NewSystemAdminHandler(
	sysAdminUC usecase.SystemAdminUsecase,
	tenantUC usecase.TenantUsecase,
	couponUC usecase.CouponUsecase,
	subUC usecase.SubscriptionUsecase,
) *SystemAdminHandler {
	return &SystemAdminHandler{
		sysAdminUC: sysAdminUC,
		tenantUC:   tenantUC,
		couponUC:   couponUC,
		subUC:      subUC,
	}
}

// Login handles system admin login via /internal/sys-login
func (h *SystemAdminHandler) Login(c *gin.Context) {
	var req dto.SystemAdminLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	loginResp, err := h.sysAdminUC.Login(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrSysAdminInvalidCredentials {
			errors.ErrorResponse(c, "INVALID_CREDENTIALS", nil, nil)
			return
		}
		if err == usecase.ErrSysAdminDisabled {
			errors.ErrorResponse(c, "ACCOUNT_DISABLED", map[string]interface{}{
				"reason": "System admin account is disabled",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	// Set HttpOnly cookie for system admin (separate cookie name from tenant)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "gims_sys_access_token",
		Value:    loginResp.AccessToken,
		Path:     "/",
		MaxAge:   config.AppConfig.JWT.AccessTokenTTL * 3600,
		Secure:   true,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
	})

	// Clear access token from response body
	loginResp.AccessToken = ""
	loginResp.RefreshToken = ""

	response.SuccessResponse(c, loginResp, nil)
}

// Logout handles system admin logout
func (h *SystemAdminHandler) Logout(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "gims_sys_access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Secure:   true,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
	})

	response.SuccessResponse(c, gin.H{"message": "logged out"}, nil)
}

// Me returns the current system admin info from the JWT session
func (h *SystemAdminHandler) Me(c *gin.Context) {
	adminID, _ := c.Get("user_id")
	adminEmail, _ := c.Get("user_email")

	id, _ := adminID.(string)
	email, _ := adminEmail.(string)

	response.SuccessResponse(c, gin.H{
		"id":    id,
		"email": email,
		"role":  "system_admin",
	}, nil)
}

// ListTenants returns all tenants with pagination and search (system admin only)
func (h *SystemAdminHandler) ListTenants(c *gin.Context) {
	var params dto.TenantListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		errors.InvalidRequestBodyResponse(c)
		return
	}

	tenants, pagination, err := h.tenantUC.ListTenantsPaginated(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{Pagination: pagination}
	response.SuccessResponse(c, tenants, meta)
}

// GetTenantDetail returns detail for a single tenant (system admin only)
func (h *SystemAdminHandler) GetTenantDetail(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"id": "required"}, nil)
		return
	}

	tenant, err := h.tenantUC.GetTenantDetail(c.Request.Context(), id)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, tenant, nil)
}

// Dashboard returns system admin dashboard summary
func (h *SystemAdminHandler) Dashboard(c *gin.Context) {
	tenants, err := h.tenantUC.ListTenants(c.Request.Context())
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, gin.H{
		"total_tenants": len(tenants),
		"tenants":       tenants,
	}, nil)
}

// ─── Coupon endpoints ────────────────────────────────────────────────────────

// CreateCoupon generates a new coupon (system admin only).
func (h *SystemAdminHandler) CreateCoupon(c *gin.Context) {
	var req dto.CreateCouponRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if ve, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, ve)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	adminEmail, _ := c.Get("user_email")
	email, _ := adminEmail.(string)

	coupon, err := h.couponUC.Create(c.Request.Context(), &req, email)
	if err != nil {
		if err == usecase.ErrCouponDuplicate {
			errors.ErrorResponse(c, "COUPON_CODE_EXISTS", map[string]interface{}{
				"field": "code",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, coupon, nil)
}

// ListCoupons returns a paginated list of coupons (system admin only).
func (h *SystemAdminHandler) ListCoupons(c *gin.Context) {
	var params dto.CouponListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		errors.InvalidRequestBodyResponse(c)
		return
	}

	coupons, pagination, err := h.couponUC.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{Pagination: pagination}
	response.SuccessResponse(c, coupons, meta)
}

// SetCouponStatus activates or deactivates a coupon (system admin only).
func (h *SystemAdminHandler) SetCouponStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"id": "required"}, nil)
		return
	}

	var req dto.SetCouponStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		errors.InvalidRequestBodyResponse(c)
		return
	}

	if err := h.couponUC.SetActive(c.Request.Context(), id, req.IsActive); err != nil {
		if err == usecase.ErrCouponNotFound {
			errors.ErrorResponse(c, "COUPON_NOT_FOUND", nil, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseNoContent(c)
}

// ─── Subscription endpoints ──────────────────────────────────────────────────

// ListSubscriptions returns all tenant subscriptions (system admin only).
func (h *SystemAdminHandler) ListSubscriptions(c *gin.Context) {
	var params dto.SubscriptionListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		errors.InvalidRequestBodyResponse(c)
		return
	}

	subs, pagination, err := h.subUC.ListAll(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{Pagination: pagination}
	response.SuccessResponse(c, subs, meta)
}

// GetTenantSubscription returns the active subscription for a specific tenant (system admin only).
func (h *SystemAdminHandler) GetTenantSubscription(c *gin.Context) {
	tenantID := c.Param("id")
	if tenantID == "" {
		errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"tenant_id": "required"}, nil)
		return
	}

	sub, err := h.subUC.GetActiveByTenant(c.Request.Context(), tenantID)
	if err != nil {
		if err == usecase.ErrSubscriptionNotFound {
			errors.ErrorResponse(c, "SUBSCRIPTION_NOT_FOUND", nil, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, sub, nil)
}
