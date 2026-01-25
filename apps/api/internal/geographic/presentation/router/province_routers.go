package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/geographic/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterProvinceRoutes registers province routes
func RegisterProvinceRoutes(rg *gin.RouterGroup, h *handler.ProvinceHandler) {
	g := rg.Group("/provinces")
	g.GET("", middleware.RequirePermission("province.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("province.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("province.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("province.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("province.delete"), h.Delete)
}
