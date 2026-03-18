package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/purchase/data/repositories"
	"github.com/gilabs/gims/api/internal/purchase/domain/dto"
	"github.com/gilabs/gims/api/internal/purchase/domain/usecase"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type PurchaseReturnHandler struct {
	uc usecase.PurchaseReturnUsecase
}

func NewPurchaseReturnHandler(uc usecase.PurchaseReturnUsecase) *PurchaseReturnHandler {
	return &PurchaseReturnHandler{uc: uc}
}

func (h *PurchaseReturnHandler) GetFormData(c *gin.Context) {
	data, err := h.uc.GetFormData(c.Request.Context())
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, data, nil)
}

func (h *PurchaseReturnHandler) List(c *gin.Context) {
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

	params := repositories.PurchaseReturnListParams{
		Search:         c.Query("search"),
		Status:         c.Query("status"),
		Action:         c.Query("action"),
		GoodsReceiptID: c.Query("goods_receipt_id"),
		SortBy:         c.DefaultQuery("sort_by", "created_at"),
		SortDir:        c.DefaultQuery("sort_dir", "desc"),
		Limit:          perPage,
		Offset:         (page - 1) * perPage,
	}

	items, total, err := h.uc.List(c.Request.Context(), params)
	if err != nil {
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	meta := &response.Meta{
		Pagination: response.NewPaginationMeta(page, perPage, int(total)),
		Filters:    map[string]interface{}{},
		Sort: &response.SortMeta{
			Field: params.SortBy,
			Order: params.SortDir,
		},
	}
	if strings.TrimSpace(params.Search) != "" {
		meta.Filters["search"] = params.Search
	}
	if strings.TrimSpace(params.Status) != "" {
		meta.Filters["status"] = params.Status
	}
	if strings.TrimSpace(params.Action) != "" {
		meta.Filters["action"] = params.Action
	}
	if strings.TrimSpace(params.GoodsReceiptID) != "" {
		meta.Filters["goods_receipt_id"] = params.GoodsReceiptID
	}

	response.SuccessResponse(c, items, meta)
}

func (h *PurchaseReturnHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		errors.ErrorResponse(c, "INVALID_PATH_PARAM", map[string]interface{}{"message": "ID is required"}, nil)
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		errors.ErrorResponse(c, "INVALID_PATH_PARAM", map[string]interface{}{"message": "Invalid ID format"}, nil)
		return
	}

	item, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		if err == usecase.ErrPurchaseReturnNotFound {
			errors.NotFoundResponse(c, "purchase_return", id)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponse(c, item, nil)
}

func (h *PurchaseReturnHandler) Create(c *gin.Context) {
	var req dto.CreatePurchaseReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			errors.HandleValidationError(c, validationErrors)
			return
		}
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body", err.Error(), nil)
		return
	}

	item, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		if err == usecase.ErrPurchaseReturnInvalid {
			errors.ErrorResponse(c, "VALIDATION_ERROR", map[string]interface{}{"message": err.Error()}, nil)
			return
		}
		errors.InternalServerErrorResponse(c, err.Error())
		return
	}

	response.SuccessResponseCreated(c, item, nil)
}
