package router

import (
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterCustomerInvoiceDownPaymentRoutes registers the routes for customer invoice down payment
func RegisterCustomerInvoiceDownPaymentRoutes(router *gin.RouterGroup, handler *handler.CustomerInvoiceDownPaymentHandler) {
	group := router.Group("/customer-invoice-down-payments")
	{
		group.GET("", handler.List)
		group.GET("/add", handler.Add)
		group.GET("/export", handler.Export)
		group.GET("/:id", handler.GetByID)
		group.GET("/:id/audit-trail", handler.AuditTrail)

		group.POST("", handler.Create)
		group.POST("/:id/pending", handler.Pending)

		group.PUT("/:id", handler.Update)
		group.DELETE("/:id", handler.Delete)
	}
}
