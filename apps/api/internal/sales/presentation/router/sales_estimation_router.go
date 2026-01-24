package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterSalesEstimationRoutes registers sales estimation routes
func RegisterSalesEstimationRoutes(rg *gin.RouterGroup, h *handler.SalesEstimationHandler) {
	g := rg.Group("/sales-estimations")
	g.GET("", middleware.RequirePermission("sales_estimation.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("sales_estimation.read"), h.GetByID)
	g.GET("/:id/items", middleware.RequirePermission("sales_estimation.read"), h.ListItems)
	g.POST("", middleware.RequirePermission("sales_estimation.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("sales_estimation.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("sales_estimation.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("sales_estimation.update"), h.UpdateStatus)
	g.POST("/:id/convert-to-quotation", middleware.RequirePermission("sales_estimation.convert"), h.ConvertToQuotation)
}
