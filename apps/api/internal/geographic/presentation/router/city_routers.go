package router

import (
	"github.com/gilabs/gims/api/internal/geographic/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterCityRoutes registers city routes
func RegisterCityRoutes(rg *gin.RouterGroup, h *handler.CityHandler) {
	g := rg.Group("/cities")
	g.GET("", h.List)
	g.GET("/:id", h.GetByID)
	g.POST("", h.Create)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}
