package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterSalesQuotationRoutes registers sales quotation routes
func RegisterSalesQuotationRoutes(rg *gin.RouterGroup, h *handler.SalesQuotationHandler) {
	g := rg.Group("/sales-quotations")
	g.GET("", middleware.RequirePermission("sales_quotation.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("sales_quotation.read"), h.GetByID)
	g.GET("/:id/items", middleware.RequirePermission("sales_quotation.read"), h.ListItems)
	g.POST("", middleware.RequirePermission("sales_quotation.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("sales_quotation.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("sales_quotation.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("sales_quotation.update"), h.UpdateStatus)
}
