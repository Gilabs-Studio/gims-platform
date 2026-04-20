package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/general/domain/dto"
	"github.com/gilabs/gims/api/internal/general/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// OnboardingHandler handles tenant onboarding state endpoints.
type OnboardingHandler struct {
	uc usecase.OnboardingUsecase
}

func NewOnboardingHandler(uc usecase.OnboardingUsecase) *OnboardingHandler {
	return &OnboardingHandler{uc: uc}
}

// GetState returns the current onboarding state for the active tenant.
func (h *OnboardingHandler) GetState(c *gin.Context) {
	state, err := h.uc.GetState(c.Request.Context())
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, state, nil)
}

// SetBusinessType sets the business type for the active tenant's onboarding.
func (h *OnboardingHandler) SetBusinessType(c *gin.Context) {
	var req dto.SetBusinessTypeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	state, err := h.uc.SetBusinessType(c.Request.Context(), req.BusinessType)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, state, nil)
}

// MarkComplete marks onboarding as completed for the active tenant.
func (h *OnboardingHandler) MarkComplete(c *gin.Context) {
	state, err := h.uc.MarkComplete(c.Request.Context())
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, state, nil)
}
