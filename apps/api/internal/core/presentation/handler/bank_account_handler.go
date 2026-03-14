package handler

import (
	"strconv"

	"github.com/gilabs/gims/api/internal/core/data/repositories"
	"github.com/gilabs/gims/api/internal/core/domain/dto"
	"github.com/gilabs/gims/api/internal/core/domain/usecase"
	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type BankAccountHandler struct {
	uc usecase.BankAccountUsecase
}

func NewBankAccountHandler(uc usecase.BankAccountUsecase) *BankAccountHandler {
	return &BankAccountHandler{uc: uc}
}

// List handles GET /finance/bank-accounts
func (h *BankAccountHandler) List(c *gin.Context) {
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

	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortDir := c.DefaultQuery("sort_dir", "desc")

	isActive := c.Query("is_active")
	var activePtr *bool
	if isActive == "true" {
		v := true
		activePtr = &v
	} else if isActive == "false" {
		v := false
		activePtr = &v
	}

	params := repositories.BankAccountListParams{
		Search:   search,
		IsActive: activePtr,
		SortBy:   sortBy,
		SortDir:  sortDir,
		Limit:    perPage,
		Offset:   (page - 1) * perPage,
	}

	items, total, err := h.uc.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	meta := &response.Meta{
		Pagination: response.NewPaginationMeta(page, perPage, int(total)),
		Filters:    map[string]interface{}{},
		Sort: &response.SortMeta{
			Field: params.SortBy,
			Order: params.SortDir,
		},
	}
	if params.Search != "" {
		meta.Filters["search"] = params.Search
	}
	if activePtr != nil {
		meta.Filters["is_active"] = *activePtr
	}
	meta.Pagination.TotalPages = totalPages
	meta.Pagination.HasNext = page < totalPages
	meta.Pagination.HasPrev = page > 1

	response.SuccessResponse(c, items, meta)
}

// ListUnified handles GET /finance/bank-accounts/unified
func (h *BankAccountHandler) ListUnified(c *gin.Context) {
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

	params := repositories.BankAccountListParams{
		Search:     c.Query("search"),
		OwnerType:  c.Query("owner_type"),
		CurrencyID: c.Query("currency_id"),
		SortBy:     c.DefaultQuery("sort_by", "created_at"),
		SortDir:    c.DefaultQuery("sort_dir", "desc"),
		Limit:      perPage,
		Offset:     (page - 1) * perPage,
	}

	items, total, err := h.uc.ListUnified(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	meta := &response.Meta{
		Pagination: response.NewPaginationMeta(page, perPage, int(total)),
		Filters:    map[string]interface{}{},
		Sort: &response.SortMeta{
			Field: params.SortBy,
			Order: params.SortDir,
		},
	}
	if params.Search != "" {
		meta.Filters["search"] = params.Search
	}
	if params.OwnerType != "" {
		meta.Filters["owner_type"] = params.OwnerType
	}
	if params.CurrencyID != "" {
		meta.Filters["currency_id"] = params.CurrencyID
	}
	meta.Pagination.TotalPages = totalPages
	meta.Pagination.HasNext = page < totalPages
	meta.Pagination.HasPrev = page > 1

	response.SuccessResponse(c, items, meta)
}

// ListTransactionHistory handles GET /finance/bank-accounts/:id/transaction-history
func (h *BankAccountHandler) ListTransactionHistory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	items, total, err := h.uc.ListTransactionHistory(c.Request.Context(), id, perPage, (page-1)*perPage)
	if err != nil {
		if err == usecase.ErrBankAccountNotFound {
			errors.NotFoundResponse(c, "bank_account", id)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}
	meta := &response.Meta{
		Pagination: response.NewPaginationMeta(page, perPage, int(total)),
		Filters:    map[string]interface{}{},
	}
	meta.Pagination.TotalPages = totalPages
	meta.Pagination.HasNext = page < totalPages
	meta.Pagination.HasPrev = page > 1

	response.SuccessResponse(c, items, meta)
}

// GetByID handles GET /finance/bank-accounts/:id
func (h *BankAccountHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}
	res, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrBankAccountNotFound {
			errors.NotFoundResponse(c, "bank_account", id)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, res, nil)
}

// Create handles POST /finance/bank-accounts
func (h *BankAccountHandler) Create(c *gin.Context) {
	var req dto.CreateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}
	res, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

// Update handles PUT /finance/bank-accounts/:id
func (h *BankAccountHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}
	var req dto.UpdateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		errors.InvalidRequestBodyResponse(c)
		return
	}
	res, err := h.uc.Update(c.Request.Context(), id, &req)
	if err != nil {
		if err == usecase.ErrBankAccountNotFound {
			errors.NotFoundResponse(c, "bank_account", id)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, res, nil)
}

// Delete handles DELETE /finance/bank-accounts/:id
func (h *BankAccountHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_ID", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}
	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		if err == usecase.ErrBankAccountNotFound {
			errors.NotFoundResponse(c, "bank_account", id)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}
	response.SuccessResponse(c, map[string]interface{}{"id": id}, nil)
}
