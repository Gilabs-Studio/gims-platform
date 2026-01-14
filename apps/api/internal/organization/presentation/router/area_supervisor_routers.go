package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/organization/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterAreaSupervisorRoutes registers area supervisor routes
func RegisterAreaSupervisorRoutes(rg *gin.RouterGroup, h *handler.AreaSupervisorHandler) {
	g := rg.Group("/area-supervisors")
	g.GET("", middleware.RequirePermission("area_supervisor.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("area_supervisor.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("area_supervisor.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("area_supervisor.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("area_supervisor.delete"), h.Delete)
	// Area assignment endpoint
	g.POST("/:id/areas", middleware.RequirePermission("area_supervisor.update"), h.AssignAreas)
}
