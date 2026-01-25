package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
)

// RegisterDeliveryOrderRoutes registers delivery order routes
func RegisterDeliveryOrderRoutes(rg *gin.RouterGroup, h *handler.DeliveryOrderHandler) {
	g := rg.Group("/delivery-orders")
	g.GET("", middleware.RequirePermission("delivery_order.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("delivery_order.read"), h.GetByID)
	g.GET("/:id/items", middleware.RequirePermission("delivery_order.read"), h.ListItems)
	g.POST("", middleware.RequirePermission("delivery_order.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("delivery_order.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("delivery_order.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("delivery_order.update"), h.UpdateStatus)
	g.POST("/:id/ship", middleware.RequirePermission("delivery_order.ship"), h.Ship)
	g.POST("/:id/deliver", middleware.RequirePermission("delivery_order.deliver"), h.Deliver)
	g.POST("/select-batches", middleware.RequirePermission("delivery_order.read"), h.SelectBatches)
}
