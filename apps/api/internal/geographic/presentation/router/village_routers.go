package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/geographic/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterVillageRoutes registers village routes
func RegisterVillageRoutes(rg *gin.RouterGroup, h *handler.VillageHandler) {
	g := rg.Group("/villages")
	g.GET("", middleware.RequirePermission("village.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("village.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("village.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("village.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("village.delete"), h.Delete)
}
