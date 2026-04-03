package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterARAPReconciliationRoutes registers AR/AP reconciliation routes.
func RegisterARAPReconciliationRoutes(group *gin.RouterGroup, h *handler.ARAPReconciliationHandler) {
	recon := group.Group("/reconciliation/arap", middleware.RequirePermission("arap_reconciliation.read"))
	{
		recon.GET("/ar", h.ReconcileAR)
		recon.GET("/ap", h.ReconcileAP)
	}
}
