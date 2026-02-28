package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterCustomerInvoiceRoutes registers customer invoice routes
func RegisterCustomerInvoiceRoutes(rg *gin.RouterGroup, h *handler.CustomerInvoiceHandler) {
	g := rg.Group("/customer-invoices")
	g.GET("", middleware.RequirePermission("customer_invoice.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("customer_invoice.read"), h.GetByID)
	g.GET("/:id/items", middleware.RequirePermission("customer_invoice.read"), h.ListItems)
	g.POST("", middleware.RequirePermission("customer_invoice.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("customer_invoice.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("customer_invoice.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("customer_invoice.update"), h.UpdateStatus)
	g.POST("/:id/approve", middleware.RequirePermission("customer_invoice.approve"), h.Approve)
}
