package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/usecase"
	"github.com/gin-gonic/gin"
)

type AssetHandler struct {
	uc usecase.AssetUsecase
}

func NewAssetHandler(uc usecase.AssetUsecase) *AssetHandler {
	return &AssetHandler{uc: uc}
}

func (h *AssetHandler) Create(c *gin.Context) {
	var req dto.CreateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Create(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_CREATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

func (h *AssetHandler) Update(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Update(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) Delete(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.Delete(c.Request.Context(), id); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_DELETE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseDeleted(c, "asset", id, nil)
}

func (h *AssetHandler) GetByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "ASSET_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) List(c *gin.Context) {
	var req dto.ListAssetsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
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
	req.Page = page
	req.PerPage = perPage

	items, total, err := h.uc.List(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ASSET_LIST_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

func (h *AssetHandler) Depreciate(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.DepreciateAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Depreciate(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_DEPRECIATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) Transfer(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.TransferAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Transfer(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_TRANSFER_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) Dispose(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.DisposeAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Dispose(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_DISPOSE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) ApproveDepreciation(c *gin.Context) {
	id := strings.TrimSpace(c.Param("dep_id"))
	res, err := h.uc.ApproveDepreciation(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ASSET_DEPRECIATE_APPROVE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) Revalue(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.RevalueAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Revalue(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ASSET_REVALUE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) Adjust(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.AdjustAssetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.Adjust(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ASSET_ADJUST_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetHandler) ApproveTransaction(c *gin.Context) {
	id := strings.TrimSpace(c.Param("tx_id"))
	res, err := h.uc.ApproveTransaction(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ASSET_TRANSACTION_APPROVE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}
