package handler

import (
	"strconv"

	"github.com/gilabs/crm-healthcare/api/internal/core/errors"
	"github.com/gilabs/crm-healthcare/api/internal/core/response"
	"github.com/gilabs/crm-healthcare/api/internal/product/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/product/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type ProductHandler struct {
	uc usecase.ProductUsecase
}

func NewProductHandler(uc usecase.ProductUsecase) *ProductHandler {
	return &ProductHandler{uc: uc}
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req dto.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if id, ok := uid.(string); ok {
			userID = id
		}
	}

	result, err := h.uc.Create(c.Request.Context(), req, userID)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, result, nil)
}

func (h *ProductHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	result, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		errors.ErrorResponse(c, "PRODUCT_NOT_FOUND", map[string]interface{}{"id": id}, nil)
		return
	}
	response.SuccessResponse(c, result, nil)
}

func (h *ProductHandler) List(c *gin.Context) {
	params := repositories.ProductListParams{
		ListParams: repositories.ListParams{
			Search:  c.Query("search"),
			SortBy:  c.DefaultQuery("sort_by", "name"),
			SortDir: c.DefaultQuery("sort_dir", "asc"),
		},
		CategoryID: c.Query("category_id"),
		BrandID:    c.Query("brand_id"),
		SegmentID:  c.Query("segment_id"),
		TypeID:     c.Query("type_id"),
		SupplierID: c.Query("supplier_id"),
		Status:     c.Query("status"),
	}

	if isApproved := c.Query("is_approved"); isApproved != "" {
		val := isApproved == "true"
		params.IsApproved = &val
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if perPage > 100 {
		perPage = 100
	}
	params.Limit = perPage
	params.Offset = (page - 1) * perPage

	results, total, err := h.uc.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page: page, PerPage: perPage, Total: int(total), TotalPages: totalPages,
			HasNext: page < totalPages, HasPrev: page > 1,
		},
		Filters: map[string]interface{}{},
	}

	if params.Search != "" {
		meta.Filters["search"] = params.Search
	}
	if params.CategoryID != "" {
		meta.Filters["category_id"] = params.CategoryID
	}
	if params.Status != "" {
		meta.Filters["status"] = params.Status
	}

	response.SuccessResponse(c, results, meta)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req dto.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	result, err := h.uc.Update(c.Request.Context(), id, req)
	if err != nil {
		errors.ErrorResponse(c, "PRODUCT_UPDATE_ERROR", map[string]interface{}{"id": id, "error": err.Error()}, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		errors.ErrorResponse(c, "PRODUCT_DELETE_ERROR", map[string]interface{}{"id": id, "error": err.Error()}, nil)
		return
	}
	response.SuccessResponseDeleted(c, "product", id, nil)
}

func (h *ProductHandler) Submit(c *gin.Context) {
	id := c.Param("id")
	result, err := h.uc.Submit(c.Request.Context(), id)
	if err != nil {
		errors.ErrorResponse(c, "PRODUCT_SUBMIT_ERROR", map[string]interface{}{"id": id, "error": err.Error()}, nil)
		return
	}
	response.SuccessResponse(c, result, nil)
}

func (h *ProductHandler) Approve(c *gin.Context) {
	id := c.Param("id")
	var req dto.ApproveProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}

	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if id, ok := uid.(string); ok {
			userID = id
		}
	}

	result, err := h.uc.Approve(c.Request.Context(), id, userID, req)
	if err != nil {
		errors.ErrorResponse(c, "PRODUCT_APPROVE_ERROR", map[string]interface{}{"id": id, "error": err.Error()}, nil)
		return
	}
	response.SuccessResponse(c, result, nil)
}
