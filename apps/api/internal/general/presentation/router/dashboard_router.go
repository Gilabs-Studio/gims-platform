package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/general/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterDashboardRoutes registers all dashboard routes under the given group
func RegisterDashboardRoutes(rg *gin.RouterGroup, h *handler.DashboardHandler) {
	g := rg.Group("/dashboard")
	{
		g.GET("/overview", middleware.RequirePermission("dashboard.view"), h.GetOverview)
		g.GET("/layout", middleware.RequirePermission("dashboard.view"), h.GetLayout)
		g.PUT("/layout", middleware.RequirePermission("dashboard.view"), h.SaveLayout)
	}
}
