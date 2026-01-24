package handler

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/errors"
	"github.com/gilabs/crm-healthcare/api/internal/core/response"
	"github.com/gilabs/crm-healthcare/api/internal/sales/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/sales/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// YearlyTargetHandler handles yearly target HTTP requests
type YearlyTargetHandler struct {
	targetUC usecase.YearlyTargetUsecase
}

// NewYearlyTargetHandler creates a new Yearly TargetHandler
func NewYearlyTargetHandler(targetUC usecase.YearlyTargetUsecase) *YearlyTargetHandler {
	return &YearlyTargetHandler{targetUC: targetUC}
}

// List handles list yearly targets request
func (h *YearlyTargetHandler) List(c *gin.Context) {
	var req dto.ListYearlyTargetsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	targets, pagination, err := h.targetUC.List(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       pagination.Page,
			PerPage:    pagination.PerPage,
			Total:      pagination.Total,
			TotalPages: pagination.TotalPages,
			HasNext:    pagination.Page < pagination.TotalPages,
			HasPrev:    pagination.Page > 1,
		},
		Filters: map[string]interface{}{},
	}

	if req.Search != "" {
		meta.Filters["search"] = req.Search
	}
	if req.Year != nil {
		meta.Filters["year"] = *req.Year
	}
	if req.AreaID != "" {
		meta.Filters["area_id"] = req.AreaID
	}
	if req.Status != "" {
		meta.Filters["status"] = req.Status
	}

	response.SuccessResponse(c, targets, meta)
}

// GetByID handles get yearly target by ID request
func (h *YearlyTargetHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	target, err := h.targetUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrYearlyTargetNotFound {
			errors.ErrorResponse(c, "YEARLY_TARGET_NOT_FOUND", map[string]interface{}{
				"target_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, target, nil)
}

// Create handles create yearly target request
func (h *YearlyTargetHandler) Create(c *gin.Context) {
	var req dto.CreateYearlyTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	target, err := h.targetUC.Create(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			meta.CreatedBy = id
		}
	}

	response.SuccessResponseCreated(c, target, meta)
}

// Update handles update yearly target request
func (h *YearlyTargetHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateYearlyTargetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	target, err := h.targetUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrYearlyTargetNotFound {
			errors.ErrorResponse(c, "YEARLY_TARGET_NOT_FOUND", map[string]interface{}{
				"target_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidTargetStatus {
			errors.ErrorResponse(c, "INVALID_TARGET_STATUS", map[string]interface{}{
				"message": "Cannot modify target in current status",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID, exists := c.Get("user_id"); exists {
		if uid, ok := userID.(string); ok {
			meta.UpdatedBy = uid
		}
	}

	response.SuccessResponse(c, target, meta)
}

// Delete handles delete yearly target request
func (h *YearlyTargetHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.targetUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrYearlyTargetNotFound {
			errors.ErrorResponse(c, "YEARLY_TARGET_NOT_FOUND", map[string]interface{}{
				"target_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidTargetStatus {
			errors.ErrorResponse(c, "INVALID_TARGET_STATUS", map[string]interface{}{
				"message": "Cannot delete target in current status",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(string); ok {
			meta.DeletedBy = uid
		}
	}

	response.SuccessResponseDeleted(c, "yearly_target", id, meta)
}

// UpdateStatus handles update yearly target status request
func (h *YearlyTargetHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateYearlyTargetStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	var userID *string
	if uid, exists := c.Get("user_id"); exists {
		if id, ok := uid.(string); ok {
			userID = &id
		}
	}

	target, err := h.targetUC.UpdateStatus(c.Request.Context(), id, &req, userID)
	if err != nil {
		if err == usecase.ErrYearlyTargetNotFound {
			errors.ErrorResponse(c, "YEARLY_TARGET_NOT_FOUND", map[string]interface{}{
				"target_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidStatusTransition {
			errors.ErrorResponse(c, "INVALID_STATUS_TRANSITION", map[string]interface{}{
				"message": "Invalid status transition",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if userID != nil {
		meta.UpdatedBy = *userID
	}

	response.SuccessResponse(c, target, meta)
}
