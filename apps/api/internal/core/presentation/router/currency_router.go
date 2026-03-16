package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/core/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterCurrencyRoutes(rg *gin.RouterGroup, h *handler.CurrencyHandler) {
	g := rg.Group("/currencies")
	{
		g.POST("", middleware.RequirePermission("currency.create"), h.Create)
		g.GET("", middleware.RequirePermission("currency.read"), h.List)
		g.GET("/:id", middleware.RequirePermission("currency.read"), h.GetByID)
		g.PUT("/:id", middleware.RequirePermission("currency.update"), h.Update)
		g.DELETE("/:id", middleware.RequirePermission("currency.delete"), h.Delete)
	}
}
