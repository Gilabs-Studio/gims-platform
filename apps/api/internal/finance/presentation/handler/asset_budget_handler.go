package handler

import (
	"net/http"
	"strconv"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type AssetBudgetHandler struct {
	usecase usecase.AssetBudgetUsecase
}

func NewAssetBudgetHandler(uc usecase.AssetBudgetUsecase) *AssetBudgetHandler {
	return &AssetBudgetHandler{usecase: uc}
}

func (h *AssetBudgetHandler) Create(c *gin.Context) {
	var req dto.CreateAssetBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	resp, err := h.usecase.Create(c.Request.Context(), &req)
	if err != nil {
		switch err {
		case usecase.ErrActiveBudgetExists:
			response.ErrorResponse(c, http.StatusConflict, "CONFLICT", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func (h *AssetBudgetHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "ID is required", nil, nil)
		return
	}

	var req dto.UpdateAssetBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	resp, err := h.usecase.Update(c.Request.Context(), id, &req)
	if err != nil {
		switch err {
		case usecase.ErrAssetBudgetNotFound:
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func (h *AssetBudgetHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "ID is required", nil, nil)
		return
	}

	if err := h.usecase.Delete(c.Request.Context(), id); err != nil {
		switch err {
		case usecase.ErrAssetBudgetNotFound:
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, gin.H{"id": id}, nil)
}

func (h *AssetBudgetHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "ID is required", nil, nil)
		return
	}

	resp, err := h.usecase.GetByID(c.Request.Context(), id)
	if err != nil {
		switch err {
		case usecase.ErrAssetBudgetNotFound:
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func (h *AssetBudgetHandler) GetByCode(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Code is required", nil, nil)
		return
	}

	resp, err := h.usecase.GetByCode(c.Request.Context(), code)
	if err != nil {
		switch err {
		case usecase.ErrAssetBudgetNotFound:
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func (h *AssetBudgetHandler) List(c *gin.Context) {
	var req dto.ListAssetBudgetsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	req.Page = page
	req.PerPage = perPage

	budgets, total, err := h.usecase.List(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	meta := &response.Meta{
		Pagination: &response.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      int(total),
			TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
		},
	}

	response.SuccessResponse(c, budgets, meta)
}

func (h *AssetBudgetHandler) ChangeStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "ID is required", nil, nil)
		return
	}

	var req dto.ChangeAssetBudgetStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}

	resp, err := h.usecase.ChangeStatus(c.Request.Context(), id, req.Status)
	if err != nil {
		switch err {
		case usecase.ErrAssetBudgetNotFound:
			response.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", err.Error(), nil, nil)
		case usecase.ErrInvalidBudgetStatus:
			response.ErrorResponse(c, http.StatusBadRequest, "INVALID_STATUS", err.Error(), nil, nil)
		default:
			response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		}
		return
	}

	response.SuccessResponse(c, resp, nil)
}

func (h *AssetBudgetHandler) GetFormData(c *gin.Context) {
	resp, err := h.usecase.GetFormData(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, resp, nil)
}
