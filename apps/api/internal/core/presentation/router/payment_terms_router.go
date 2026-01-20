package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/core/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterPaymentTermsRoutes(rg *gin.RouterGroup, h *handler.PaymentTermsHandler) {
	g := rg.Group("/payment-terms")
	{
		g.POST("", middleware.RequirePermission("payment_term.create"), h.Create)
		g.GET("", middleware.RequirePermission("payment_term.read"), h.List)
		g.GET("/:id", middleware.RequirePermission("payment_term.read"), h.GetByID)
		g.PUT("/:id", middleware.RequirePermission("payment_term.update"), h.Update)
		g.DELETE("/:id", middleware.RequirePermission("payment_term.delete"), h.Delete)
	}
}
