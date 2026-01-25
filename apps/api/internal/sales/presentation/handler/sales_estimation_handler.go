package handler

import (
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/sales/domain/dto"
	"github.com/gilabs/gims/api/internal/sales/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

// SalesEstimationHandler handles sales estimation HTTP requests
type SalesEstimationHandler struct {
	estimationUC usecase.SalesEstimationUsecase
}

// NewSalesEstimationHandler creates a new SalesEstimationHandler
func NewSalesEstimationHandler(estimationUC usecase.SalesEstimationUsecase) *SalesEstimationHandler {
	return &SalesEstimationHandler{estimationUC: estimationUC}
}

// List handles list sales estimations request
func (h *SalesEstimationHandler) List(c *gin.Context) {
	var req dto.ListSalesEstimationsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	estimations, pagination, err := h.estimationUC.List(c.Request.Context(), &req)
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
	if req.Status != "" {
		meta.Filters["status"] = req.Status
	}
	if req.DateFrom != "" {
		meta.Filters["date_from"] = req.DateFrom
	}
	if req.DateTo != "" {
		meta.Filters["date_to"] = req.DateTo
	}
	if req.SalesRepID != "" {
		meta.Filters["sales_rep_id"] = req.SalesRepID
	}
	if req.BusinessUnitID != "" {
		meta.Filters["business_unit_id"] = req.BusinessUnitID
	}
	if req.AreaID != "" {
		meta.Filters["area_id"] = req.AreaID
	}

	response.SuccessResponse(c, estimations, meta)
}

// GetByID handles get sales estimation by ID request
func (h *SalesEstimationHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	estimation, err := h.estimationUC.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", map[string]interface{}{
				"estimation_id": id,
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, estimation, nil)
}

// Create handles create sales estimation request
func (h *SalesEstimationHandler) Create(c *gin.Context) {
	var req dto.CreateSalesEstimationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	var createdBy *string
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(string); ok {
			createdBy = &id
		}
	}

	estimation, err := h.estimationUC.Create(c.Request.Context(), &req, createdBy)
	if err != nil {
		if err == usecase.ErrProductNotFound {
			errors.ErrorResponse(c, "PRODUCT_NOT_FOUND", map[string]interface{}{
				"message": "One or more products not found",
			}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{}
	if createdBy != nil {
		meta.CreatedBy = *createdBy
	}

	response.SuccessResponseCreated(c, estimation, meta)
}

// Update handles update sales estimation request
func (h *SalesEstimationHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateSalesEstimationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	estimation, err := h.estimationUC.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", map[string]interface{}{
				"estimation_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidEstimationStatus {
			errors.ErrorResponse(c, "INVALID_ESTIMATION_STATUS", map[string]interface{}{
				"message": "Cannot modify estimation in current status",
			}, nil)
			return
		}
		if err == usecase.ErrProductNotFound {
			errors.ErrorResponse(c, "PRODUCT_NOT_FOUND", map[string]interface{}{
				"message": "One or more products not found",
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

	response.SuccessResponse(c, estimation, meta)
}

// Delete handles delete sales estimation request
func (h *SalesEstimationHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	err := h.estimationUC.Delete(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", map[string]interface{}{
				"estimation_id": id,
			}, nil)
			return
		}
		if err == usecase.ErrInvalidEstimationStatus {
			errors.ErrorResponse(c, "INVALID_ESTIMATION_STATUS", map[string]interface{}{
				"message": "Cannot delete estimation in current status",
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

	response.SuccessResponseDeleted(c, "sales_estimation", id, meta)
}

// UpdateStatus handles update sales estimation status request
func (h *SalesEstimationHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateSalesEstimationStatusRequest
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

	estimation, err := h.estimationUC.UpdateStatus(c.Request.Context(), id, &req, userID)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", map[string]interface{}{
				"estimation_id": id,
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

	response.SuccessResponse(c, estimation, meta)
}

// ConvertToQuotation handles request to convert estimation to quotation
func (h *SalesEstimationHandler) ConvertToQuotation(c *gin.Context) {
	id := c.Param("id")
	var req dto.ConvertToQuotationRequest
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

	quotationID, err := h.estimationUC.ConvertToQuotation(c.Request.Context(), id, &req, userID)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", nil, nil)
			return 
		}
		if err == usecase.ErrEstimationAlreadyConverted {
			errors.ErrorResponse(c, "ESTIMATION_ALREADY_CONVERTED", nil, nil)
			return
		}
		// Generic internal server error or specific message
		errors.ErrorResponse(c, "CONVERSION_FAILED", map[string]interface{}{
			"message": err.Error(),
		}, nil)
		return
	}

	response.SuccessResponse(c, map[string]string{"quotation_id": quotationID}, nil)
}

// ListItems handles list sales estimation items request
func (h *SalesEstimationHandler) ListItems(c *gin.Context) {
	estimationID := c.Param("id")
	var req dto.ListSalesEstimationItemsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidQueryParamResponse(c)
		return
	}

	items, pagination, err := h.estimationUC.ListItems(c.Request.Context(), estimationID, &req)
	if err != nil {
		if err == usecase.ErrSalesEstimationNotFound {
			errors.ErrorResponse(c, "SALES_ESTIMATION_NOT_FOUND", map[string]interface{}{
				"estimation_id": estimationID,
			}, nil)
			return
		}
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
	}

	response.SuccessResponse(c, items, meta)
}
