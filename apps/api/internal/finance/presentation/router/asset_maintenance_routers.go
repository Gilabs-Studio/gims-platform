package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	assetMaintenanceRead   = "asset_maintenance.read"
	assetMaintenanceCreate = "asset_maintenance.create"
	assetMaintenanceUpdate = "asset_maintenance.update"
	assetMaintenanceDelete = "asset_maintenance.delete"
	assetMaintenanceApprove = "asset_maintenance.approve"
)

func RegisterAssetMaintenanceRoutes(r *gin.RouterGroup, h *handler.AssetMaintenanceHandler) {
	g := r.Group("/maintenance")

	// Dashboard & Alerts
	g.GET("/dashboard", middleware.RequirePermission(assetMaintenanceRead), h.GetDashboard)
	g.GET("/alerts", middleware.RequirePermission(assetMaintenanceRead), h.GetAlerts)

	// Form Data
	g.GET("/form-data", middleware.RequirePermission(assetMaintenanceRead), h.GetFormData)

	// Maintenance Schedules
	schedules := g.Group("/schedules")
	schedules.GET("", middleware.RequirePermission(assetMaintenanceRead), h.ListSchedules)
	schedules.GET("/", middleware.RequirePermission(assetMaintenanceRead), h.ListSchedules)
	schedules.POST("", middleware.RequirePermission(assetMaintenanceCreate), h.CreateSchedule)
	schedules.POST("/", middleware.RequirePermission(assetMaintenanceCreate), h.CreateSchedule)
	schedules.GET("/:id", middleware.RequirePermission(assetMaintenanceRead), h.GetScheduleByID)
	schedules.PUT("/:id", middleware.RequirePermission(assetMaintenanceUpdate), h.UpdateSchedule)
	schedules.DELETE("/:id", middleware.RequirePermission(assetMaintenanceDelete), h.DeleteSchedule)

	// Work Orders
	workOrders := g.Group("/work-orders")
	workOrders.GET("", middleware.RequirePermission(assetMaintenanceRead), h.ListWorkOrders)
	workOrders.GET("/", middleware.RequirePermission(assetMaintenanceRead), h.ListWorkOrders)
	workOrders.POST("", middleware.RequirePermission(assetMaintenanceCreate), h.CreateWorkOrder)
	workOrders.POST("/", middleware.RequirePermission(assetMaintenanceCreate), h.CreateWorkOrder)
	workOrders.GET("/:id", middleware.RequirePermission(assetMaintenanceRead), h.GetWorkOrderByID)
	workOrders.PUT("/:id", middleware.RequirePermission(assetMaintenanceUpdate), h.UpdateWorkOrder)
	workOrders.PUT("/:id/status", middleware.RequirePermission(assetMaintenanceUpdate), h.UpdateWorkOrderStatus)
	workOrders.DELETE("/:id", middleware.RequirePermission(assetMaintenanceDelete), h.DeleteWorkOrder)
	workOrders.POST("/:id/spare-parts", middleware.RequirePermission(assetMaintenanceUpdate), h.AddSparePartToWorkOrder)
	workOrders.DELETE("/:id/spare-parts/:spare_part_id", middleware.RequirePermission(assetMaintenanceUpdate), h.RemoveSparePartFromWorkOrder)

	// Spare Parts
	spareParts := g.Group("/spare-parts")
	spareParts.GET("", middleware.RequirePermission(assetMaintenanceRead), h.ListSpareParts)
	spareParts.GET("/", middleware.RequirePermission(assetMaintenanceRead), h.ListSpareParts)
	spareParts.POST("", middleware.RequirePermission(assetMaintenanceCreate), h.CreateSparePart)
	spareParts.POST("/", middleware.RequirePermission(assetMaintenanceCreate), h.CreateSparePart)
	spareParts.GET("/:id", middleware.RequirePermission(assetMaintenanceRead), h.GetSparePartByID)
	spareParts.PUT("/:id", middleware.RequirePermission(assetMaintenanceUpdate), h.UpdateSparePart)
	spareParts.PUT("/:id/stock", middleware.RequirePermission(assetMaintenanceUpdate), h.UpdateSparePartStock)
	spareParts.DELETE("/:id", middleware.RequirePermission(assetMaintenanceDelete), h.DeleteSparePart)

	// Asset-Spare Part Links
	g.POST("/asset-spare-part-links", middleware.RequirePermission(assetMaintenanceUpdate), h.LinkAssetToSparePart)
	g.DELETE("/asset-spare-part-links/:asset_id/:spare_part_id", middleware.RequirePermission(assetMaintenanceDelete), h.UnlinkAssetFromSparePart)
}
