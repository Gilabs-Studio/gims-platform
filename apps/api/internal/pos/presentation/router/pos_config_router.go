package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
)

// RegisterPOSConfigRoutes registers POS configuration routes
func RegisterPOSConfigRoutes(rg *gin.RouterGroup, h *handler.POSConfigHandler) {
	configs := rg.Group("/config/outlet/:outletID")

	// Read access for cashiers
	configs.GET("", middleware.RequirePermission("pos.config.read"), h.GetByOutlet)
	// Write access for managers/owners only
	configs.PUT("", middleware.RequirePermission("pos.config.manage"), h.Upsert)
}
