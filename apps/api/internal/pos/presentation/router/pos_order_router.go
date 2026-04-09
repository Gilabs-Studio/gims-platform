package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterPOSOrderRoutes registers POS order and catalog routes
func RegisterPOSOrderRoutes(rg *gin.RouterGroup, h *handler.POSOrderHandler) {
	// POS catalog endpoint (read-only, per outlet)
	rg.GET("/catalog/outlet/:outletID", middleware.RequirePermission("pos.order.create"), h.GetCatalog)

	orders := rg.Group("/orders")
	orders.Use(middleware.RequirePermission("pos.order.create"))

	// Static routes before parameterized
	orders.POST("", h.Create)
	orders.GET("", middleware.RequirePermission("pos.order.read"), h.List)
	orders.GET("/:id", h.GetByID)
	orders.POST("/:id/confirm", h.Confirm)
	orders.POST("/:id/void", h.Void)
	orders.POST("/:id/assign-table", h.AssignTable)

	// Order item management
	orders.POST("/:id/items", h.AddItem)
	orders.PUT("/:id/items/:itemID", h.UpdateItem)
	orders.DELETE("/:id/items/:itemID", h.RemoveItem)
}
