package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterPOSPaymentRoutes registers POS payment routes
func RegisterPOSPaymentRoutes(rg *gin.RouterGroup, h *handler.POSPaymentHandler) {
	// Use :id to match the existing /orders/:id routes and avoid Gin wildcard conflicts.
	payments := rg.Group("/orders/:id/payments")
	payments.Use(middleware.RequirePermission("pos.payment.process"))

	payments.GET("", h.GetByOrder)
	payments.POST("/cash", h.ProcessCash)
	payments.POST("/midtrans", h.InitiateMidtrans)

	// Midtrans webhook — no auth required (server-to-server callback)
	// Registered directly on the parent group to avoid the permission middleware
	rg.POST("/webhook/midtrans", h.MidtransWebhook)
}
