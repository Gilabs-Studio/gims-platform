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
	lowStock := c.Query("low_stock") == "true"

	req := &dto.GetInventoryListRequest{
		Page:        page,
		PerPage:     perPage,
		Search:      search,
		WarehouseID: warehouseID,
		LowStock:    lowStock,
	}

	result, err := h.usecase.GetStockList(c.Request.Context(), req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error(), nil, nil)
		return
	}

	response.SuccessResponse(c, result, nil)
}
