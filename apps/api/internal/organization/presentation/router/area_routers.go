package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/organization/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterAreaRoutes registers area routes
func RegisterAreaRoutes(rg *gin.RouterGroup, h *handler.AreaHandler) {
	g := rg.Group("/areas")
	g.GET("", middleware.RequirePermission("area.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("area.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("area.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("area.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("area.delete"), h.Delete)
}
