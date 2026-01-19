package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/product/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterProductRoutes(rg *gin.RouterGroup, h *handler.ProductHandler) {
	g := rg.Group("/products")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PUT("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
		g.POST("/:id/submit", h.Submit)
		g.POST("/:id/approve", h.Approve)
	}
}
