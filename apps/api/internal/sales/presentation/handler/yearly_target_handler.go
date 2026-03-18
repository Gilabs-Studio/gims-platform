package handler

import (
	"strconv"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
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

// AuditTrail handles GET /sales/yearly-targets/:id/audit-trail
func (h *YearlyTargetHandler) AuditTrail(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_PATH_PARAM", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		errors.ErrorResponse(c, "INVALID_PATH_PARAM", map[string]interface{}{"message": "Invalid ID format"}, nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := h.targetUC.ListAuditTrail(c.Request.Context(), id, page, perPage)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}
