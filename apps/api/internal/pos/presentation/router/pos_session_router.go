package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterPOSSessionRoutes registers POS session routes
func RegisterPOSSessionRoutes(rg *gin.RouterGroup, h *handler.POSSessionHandler) {
	sessions := rg.Group("/sessions")

	// Cashier-level: open/close own session and check active session
	sessions.GET("/active", middleware.RequirePermission("pos.order.create"), h.GetActive)
	sessions.GET("/:id", middleware.RequirePermission("pos.order.create"), h.GetByID)
	sessions.POST("", middleware.RequirePermission("pos.order.create"), h.Open)
	sessions.POST("/:id/close", middleware.RequirePermission("pos.order.create"), h.Close)

	// Manager-level: list all sessions
	sessions.GET("", middleware.RequirePermission("pos.session.manage"), h.List)
}
