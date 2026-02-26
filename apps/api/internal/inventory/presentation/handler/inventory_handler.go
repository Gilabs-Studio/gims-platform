package handler

import (
	"net/http"
	"strconv"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gin-gonic/gin"
)

type InventoryHandler struct {
	usecase usecase.InventoryUsecase
}

func NewInventoryHandler(usecase usecase.InventoryUsecase) *InventoryHandler {
	return &InventoryHandler{
		usecase: usecase,
	}
}

func (h *InventoryHandler) GetStockList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")
	warehouseID := c.Query("warehouse_id")
	productID := c.Query("product_id")
	lowStock := c.Query("low_stock") == "true"

	req := &dto.GetInventoryListRequest{
		Page:        page,
		PerPage:     perPage,
		Search:      search,
		WarehouseID: warehouseID,
		ProductID:   productID,
		LowStock:    lowStock,
	}

	result, err := h.usecase.GetStockList(c.Request.Context(), req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
}

func (h *InventoryHandler) GetTreeWarehouses(c *gin.Context) {
	result, err := h.usecase.GetTreeWarehouses(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, result, nil)
}

func (h *InventoryHandler) GetTreeProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	search := c.Query("search")
	warehouseID := c.Query("warehouse_id")

	if warehouseID == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "warehouse_id is required", nil, nil)
		return
	}

	req := &dto.GetInventoryTreeProductsRequest{
		Page:        page,
		PerPage:     perPage,
		Search:      search,
		WarehouseID: warehouseID,
	}

	result, err := h.usecase.GetTreeProducts(c.Request.Context(), req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, result, nil) // Meta is inside result
}

func (h *InventoryHandler) GetTreeBatches(c *gin.Context) {
	warehouseID := c.Query("warehouse_id")
	productID := c.Query("product_id")

	if warehouseID == "" || productID == "" {
		response.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", "warehouse_id and product_id are required", nil, nil)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "10"))

	req := &dto.GetInventoryTreeBatchesRequest{
		WarehouseID: warehouseID,
		ProductID:   productID,
		Page:        page,
		PerPage:     perPage,
	}

	result, err := h.usecase.GetTreeBatches(c.Request.Context(), req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
}

func (h *InventoryHandler) GetInventoryMetrics(c *gin.Context) {
	result, err := h.usecase.GetInventoryMetrics(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, result, nil)
}
