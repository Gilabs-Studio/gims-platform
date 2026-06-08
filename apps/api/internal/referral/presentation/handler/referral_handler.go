package handler

import (
	"errors"

	coreErrors "github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/referral/domain/dto"
	"github.com/gilabs/gims/api/internal/referral/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
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
	item, err := h.uc.UpdateCode(c.Request.Context(), c.Param("id"), &req)
	if err != nil {
		h.handleError(c, err)
		return
	}
	response.SuccessResponse(c, item, nil)
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
