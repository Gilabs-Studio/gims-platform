package handler

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/referral/domain/dto"
	"github.com/gilabs/gims/api/internal/referral/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type Handler struct {
	uc usecase.ReferralUsecase
}

func NewHandler(uc usecase.ReferralUsecase) *Handler { return &Handler{uc: uc} }

func (h *Handler) ListAccounts(c *gin.Context) {
	var params dto.ListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		coreErrors.InvalidRequestBodyResponse(c)
		return
	}
	items, pagination, err := h.uc.ListAccounts(c.Request.Context(), params)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, items, &response.Meta{Pagination: pagination})
}

func (h *Handler) CreateAccount(c *gin.Context) {
	var req dto.CreateSalesReferralAccountRequest
	if !bindJSON(c, &req) {
		return
	}
	if !validateAccountRequest(c, req.Email, req.Name, req.IsActive) {
		return
	}
	item, err := h.uc.CreateAccount(c.Request.Context(), &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponse(c, item, nil)
}

func (h *Handler) UpdateAccount(c *gin.Context) {
	var req dto.UpdateSalesReferralAccountRequest
	if !bindJSON(c, &req) {
		return
	}
	if !validateAccountRequest(c, req.Email, req.Name, req.IsActive) {
		return
	}
	item, err := h.uc.UpdateAccount(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponse(c, item, nil)
}

func (h *Handler) DeleteAccount(c *gin.Context) {
	if err := h.uc.DeleteAccount(c.Request.Context(), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponseDeleted(c, "sales referral account", c.Param("id"), nil)
}

func (h *Handler) ListCodes(c *gin.Context) {
	var params dto.ListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		coreErrors.InvalidRequestBodyResponse(c)
		return
	}
	items, pagination, err := h.uc.ListCodes(c.Request.Context(), params)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, items, &response.Meta{Pagination: pagination})
}

func (h *Handler) CreateCode(c *gin.Context) {
	var req dto.CreateSalesReferralCodeRequest
	if !bindJSON(c, &req) {
		return
	}
	if !validateCodeRequest(c, req.SalesReferralAccountID, req.CouponID, req.Code, req.IsActive, req.MaxUses, req.MaxUsesPerEmail) {
		return
	}
	item, err := h.uc.CreateCode(c.Request.Context(), &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponse(c, item, nil)
}

func (h *Handler) UpdateCode(c *gin.Context) {
	var req dto.UpdateSalesReferralCodeRequest
	if !bindJSON(c, &req) {
		return
	}
	if !validateCodeRequest(c, req.SalesReferralAccountID, req.CouponID, req.Code, req.IsActive, req.MaxUses, req.MaxUsesPerEmail) {
		return
	}
	item, err := h.uc.UpdateCode(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponse(c, item, nil)
}

func validationError(c *gin.Context, field, message string) bool {
	coreErrors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{
		"field":   field,
		"message": message,
	}, nil)
	return false
}

func validateAccountRequest(c *gin.Context, email string, name *string, active *bool) bool {
	trimmedEmail := strings.TrimSpace(email)
	if trimmedEmail == "" {
		return validationError(c, "email", "Email is required.")
	}
	if strings.Contains(trimmedEmail, " ") {
		return validationError(c, "email", "Email cannot contain spaces.")
	}
	if !strings.Contains(trimmedEmail, "@") {
		return validationError(c, "email", "Email must include @.")
	}
	if strings.Count(trimmedEmail, "@") > 1 {
		return validationError(c, "email", "Email can only include one @ symbol.")
	}
	if _, err := mail.ParseAddress(trimmedEmail); err != nil {
		return validationError(c, "email", "Enter a valid email address like name@example.com.")
	}
	if name == nil || strings.TrimSpace(*name) == "" {
		return validationError(c, "name", "Name is required.")
	}
	if len(strings.TrimSpace(*name)) > 255 {
		return validationError(c, "name", "Name must be 255 characters or fewer.")
	}
	if active == nil {
		return validationError(c, "is_active", "Active status is required.")
	}
	return true
}

func validateCodeRequest(c *gin.Context, accountID, couponID, code string, active *bool, maxUses, maxUsesPerEmail int) bool {
	if strings.TrimSpace(accountID) == "" {
		return validationError(c, "sales_referral_account_id", "Sales account is required.")
	}
	if _, err := uuid.Parse(strings.TrimSpace(accountID)); err != nil {
		return validationError(c, "sales_referral_account_id", "Select a valid sales account.")
	}
	if strings.TrimSpace(couponID) == "" {
		return validationError(c, "coupon_id", "Wrapped coupon is required.")
	}
	if _, err := uuid.Parse(strings.TrimSpace(couponID)); err != nil {
		return validationError(c, "coupon_id", "Select a valid wrapped coupon.")
	}
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		return validationError(c, "code", "Public code is required.")
	}
	if len(trimmedCode) < 4 {
		return validationError(c, "code", "Public code must be at least 4 characters.")
	}
	if len(trimmedCode) > 64 {
		return validationError(c, "code", "Public code must be 64 characters or fewer.")
	}
	if strings.Contains(trimmedCode, " ") {
		return validationError(c, "code", "Public code cannot contain spaces.")
	}
	if !regexp.MustCompile(`^[A-Za-z0-9_-]+$`).MatchString(trimmedCode) {
		return validationError(c, "code", "Use only letters, numbers, underscores, or hyphens.")
	}
	if active == nil {
		return validationError(c, "is_active", "Active status is required.")
	}
	if maxUses < 1 {
		return validationError(c, "max_uses", "Max uses must be at least 1.")
	}
	if maxUses > 1000000 {
		return validationError(c, "max_uses", "Max uses must be 1,000,000 or fewer.")
	}
	if maxUsesPerEmail < 1 {
		return validationError(c, "max_uses_per_email", "Max uses per email must be at least 1.")
	}
	if maxUsesPerEmail > 1000000 {
		return validationError(c, "max_uses_per_email", "Max uses per email must be 1,000,000 or fewer.")
	}
	return true
}

func (h *Handler) SetCodeStatus(c *gin.Context) {
	var req dto.SetReferralCodeStatusRequest
	if !bindJSON(c, &req) {
		return
	}
	if err := h.uc.SetCodeActive(c.Request.Context(), c.Param("id"), req.IsActive); err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponseNoContent(c)
}

func (h *Handler) DeleteCode(c *gin.Context) {
	if err := h.uc.DeleteCode(c.Request.Context(), c.Param("id")); err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponseDeleted(c, "sales referral code", c.Param("id"), nil)
}

func (h *Handler) GetStats(c *gin.Context) {
	var params dto.ReferralStatsParams
	if err := c.ShouldBindQuery(&params); err != nil {
		coreErrors.InvalidRequestBodyResponse(c)
		return
	}
	resp, err := h.uc.GetStats(c.Request.Context(), params)
	if err != nil {
		coreErrors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, resp, nil)
}

func bindJSON(c *gin.Context, dst interface{}) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		if ve, ok := err.(validator.ValidationErrors); ok {
			coreErrors.HandleValidationError(c, ve)
			return false
		}
		coreErrors.InvalidRequestBodyResponse(c)
		return false
	}
	return true
}

func (h *Handler) handleError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, usecase.ErrReferralNotFound):
		coreErrors.ErrorResponse(c, "REFERRAL_NOT_FOUND", nil, nil)
	case errors.Is(err, usecase.ErrReferralInvalidCode):
		coreErrors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"code": "invalid format"}, nil)
	case errors.Is(err, usecase.ErrReferralCouponCollision):
		coreErrors.ErrorResponse(c, "REGISTRATION_CODE_EXISTS", map[string]interface{}{"field": "code"}, nil)
	case errors.Is(err, usecase.ErrReferralImmutable):
		coreErrors.ErrorResponse(c, "REFERRAL_CODE_IMMUTABLE", nil, nil)
	default:
		coreErrors.InternalServerErrorResponse(c, err.Error())
	}
}
