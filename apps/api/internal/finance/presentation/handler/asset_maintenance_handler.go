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

type AssetMaintenanceHandler struct {
	uc usecase.AssetMaintenanceUsecase
}

func NewAssetMaintenanceHandler(uc usecase.AssetMaintenanceUsecase) *AssetMaintenanceHandler {
	return &AssetMaintenanceHandler{uc: uc}
}

// ==================== Maintenance Schedule Handlers ====================

func (h *AssetMaintenanceHandler) CreateSchedule(c *gin.Context) {
	var req dto.CreateMaintenanceScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.CreateSchedule(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "MAINTENANCE_SCHEDULE_CREATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

func (h *AssetMaintenanceHandler) UpdateSchedule(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateMaintenanceScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateSchedule(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "MAINTENANCE_SCHEDULE_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) DeleteSchedule(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.DeleteSchedule(c.Request.Context(), id); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "MAINTENANCE_SCHEDULE_DELETE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseDeleted(c, "maintenance_schedule", id, nil)
}

func (h *AssetMaintenanceHandler) GetScheduleByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetScheduleByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "MAINTENANCE_SCHEDULE_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) ListSchedules(c *gin.Context) {
	var req dto.ListMaintenanceSchedulesRequest
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

	items, total, err := h.uc.ListSchedules(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "MAINTENANCE_SCHEDULE_LIST_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

// ==================== Work Order Handlers ====================

func (h *AssetMaintenanceHandler) CreateWorkOrder(c *gin.Context) {
	var req dto.CreateWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.CreateWorkOrder(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_CREATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

func (h *AssetMaintenanceHandler) UpdateWorkOrder(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateWorkOrder(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) UpdateWorkOrderStatus(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateWorkOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateWorkOrderStatus(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_STATUS_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) DeleteWorkOrder(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.DeleteWorkOrder(c.Request.Context(), id); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_DELETE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseDeleted(c, "work_order", id, nil)
}

func (h *AssetMaintenanceHandler) GetWorkOrderByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetWorkOrderByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "WORK_ORDER_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) ListWorkOrders(c *gin.Context) {
	var req dto.ListWorkOrdersRequest
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

	items, total, err := h.uc.ListWorkOrders(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "WORK_ORDER_LIST_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

func (h *AssetMaintenanceHandler) AddSparePartToWorkOrder(c *gin.Context) {
	workOrderID := strings.TrimSpace(c.Param("id"))
	var req dto.WorkOrderSparePartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.AddSparePartToWorkOrder(c.Request.Context(), workOrderID, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_SPARE_PART_ADD_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) RemoveSparePartFromWorkOrder(c *gin.Context) {
	workOrderID := strings.TrimSpace(c.Param("id"))
	sparePartUsageID := strings.TrimSpace(c.Param("spare_part_id"))
	res, err := h.uc.RemoveSparePartFromWorkOrder(c.Request.Context(), workOrderID, sparePartUsageID)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "WORK_ORDER_SPARE_PART_REMOVE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

// ==================== Spare Part Handlers ====================

func (h *AssetMaintenanceHandler) CreateSparePart(c *gin.Context) {
	var req dto.CreateSparePartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.CreateSparePart(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "SPARE_PART_CREATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseCreated(c, res, nil)
}

func (h *AssetMaintenanceHandler) UpdateSparePart(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateSparePartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateSparePart(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "SPARE_PART_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) UpdateSparePartStock(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	var req dto.UpdateSparePartStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	res, err := h.uc.UpdateSparePartStock(c.Request.Context(), id, &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "SPARE_PART_STOCK_UPDATE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) DeleteSparePart(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.uc.DeleteSparePart(c.Request.Context(), id); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "SPARE_PART_DELETE_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponseDeleted(c, "spare_part", id, nil)
}

func (h *AssetMaintenanceHandler) GetSparePartByID(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	res, err := h.uc.GetSparePartByID(c.Request.Context(), id)
	if err != nil {
		response.ErrorResponse(c, http.StatusNotFound, "SPARE_PART_NOT_FOUND", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) ListSpareParts(c *gin.Context) {
	var req dto.ListSparePartsRequest
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

	items, total, err := h.uc.ListSpareParts(c.Request.Context(), &req)
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "SPARE_PART_LIST_FAILED", err.Error(), nil, nil)
		return
	}
	meta := &response.Meta{Pagination: response.NewPaginationMeta(page, perPage, int(total))}
	response.SuccessResponse(c, items, meta)
}

func (h *AssetMaintenanceHandler) LinkAssetToSparePart(c *gin.Context) {
	var req dto.CreateAssetSparePartLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil, nil)
		return
	}
	if err := h.uc.LinkAssetToSparePart(c.Request.Context(), &req); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_SPARE_PART_LINK_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, gin.H{"message": "Asset linked to spare part successfully"}, nil)
}

func (h *AssetMaintenanceHandler) UnlinkAssetFromSparePart(c *gin.Context) {
	assetID := strings.TrimSpace(c.Param("asset_id"))
	sparePartID := strings.TrimSpace(c.Param("spare_part_id"))
	if err := h.uc.UnlinkAssetFromSparePart(c.Request.Context(), assetID, sparePartID); err != nil {
		response.ErrorResponse(c, http.StatusBadRequest, "ASSET_SPARE_PART_UNLINK_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, gin.H{"message": "Asset unlinked from spare part successfully"}, nil)
}

// ==================== Dashboard & Alerts Handlers ====================

func (h *AssetMaintenanceHandler) GetDashboard(c *gin.Context) {
	res, err := h.uc.GetDashboard(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "DASHBOARD_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

func (h *AssetMaintenanceHandler) GetAlerts(c *gin.Context) {
	res, err := h.uc.GetAlerts(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "ALERTS_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}

// ==================== Form Data Handler ====================

func (h *AssetMaintenanceHandler) GetFormData(c *gin.Context) {
	res, err := h.uc.GetFormData(c.Request.Context())
	if err != nil {
		response.ErrorResponse(c, http.StatusInternalServerError, "FORM_DATA_FAILED", err.Error(), nil, nil)
		return
	}
	response.SuccessResponse(c, res, nil)
}
