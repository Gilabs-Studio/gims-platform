package handler

import (
	"strconv"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	"github.com/gin-gonic/gin"
)

type PurchaseRequisitionHandler struct {
	uc usecase.PurchaseRequisitionUsecase
}

func NewPurchaseRequisitionHandler(uc usecase.PurchaseRequisitionUsecase) *PurchaseRequisitionHandler {
	return &PurchaseRequisitionHandler{uc: uc}
}

// List handles GET /purchase/purchase-requisitions
func (h *PurchaseRequisitionHandler) List(c *gin.Context) {
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

	params := repositories.PurchaseRequisitionListParams{
		Search:  c.Query("search"),
		SortBy:  c.DefaultQuery("sort_by", "created_at"),
		SortDir: c.DefaultQuery("sort_dir", "desc"),
		Limit:   perPage,
		Offset:  (page - 1) * perPage,
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
	meta.Pagination.TotalPages = totalPages
	meta.Pagination.HasNext = page < totalPages
	meta.Pagination.HasPrev = page > 1

	response.SuccessResponse(c, items, meta)
}
