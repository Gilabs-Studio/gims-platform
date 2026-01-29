package presentation

import (
	"net/http"
	"strconv"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/inventory/domain/dto"
	"github.com/gilabs/gims/api/internal/inventory/domain/usecase"
	"github.com/gin-gonic/gin"
)

type StockMovementHandler struct {
	service usecase.StockMovementService
}

func NewStockMovementHandler(service usecase.StockMovementService) *StockMovementHandler {
	return &StockMovementHandler{
		service: service,
	}
}

func (h *StockMovementHandler) GetMovements(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
	
	req := &dto.GetStockMovementsRequest{
		Page:        page,
		PerPage:     perPage,
		Search:      c.Query("search"),
		WarehouseID: c.Query("warehouse_id"),
		ProductID:   c.Query("product_id"),
		Type:        c.Query("type"),
		StartDate:   c.Query("start_date"),
		EndDate:     c.Query("end_date"),
	}

	movements, pagination, err := h.service.GetMovements(c, req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch stock movements", err, nil)
		return
	}

	meta := &response.Meta{
		Pagination: pagination,
	}

	response.SuccessResponse(c, movements, meta)
}
