package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/geographic/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterCountryRoutes registers country routes
func RegisterCountryRoutes(rg *gin.RouterGroup, h *handler.CountryHandler) {
	g := rg.Group("/countries")
	g.GET("", middleware.RequirePermission("country.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("country.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("country.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("country.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("country.delete"), h.Delete)
}
