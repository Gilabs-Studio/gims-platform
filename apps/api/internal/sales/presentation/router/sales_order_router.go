package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/handler"
)

// RegisterSalesOrderRoutes registers sales order routes
func RegisterSalesOrderRoutes(rg *gin.RouterGroup, h *handler.SalesOrderHandler) {
	g := rg.Group("/sales-orders")
	g.GET("", middleware.RequirePermission("sales_order.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("sales_order.read"), h.GetByID)
	g.GET("/:id/items", middleware.RequirePermission("sales_order.read"), h.ListItems)
	g.POST("", middleware.RequirePermission("sales_order.create"), h.Create)
	g.POST("/convert-from-quotation", middleware.RequirePermission("sales_order.create"), h.ConvertFromQuotation)
	g.PUT("/:id", middleware.RequirePermission("sales_order.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("sales_order.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("sales_order.update"), h.UpdateStatus)
}
