package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/geographic/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterDistrictRoutes registers district routes
func RegisterDistrictRoutes(rg *gin.RouterGroup, h *handler.DistrictHandler) {
	g := rg.Group("/districts")
	g.GET("", middleware.RequirePermission("district.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("district.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("district.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("district.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("district.delete"), h.Delete)
}
