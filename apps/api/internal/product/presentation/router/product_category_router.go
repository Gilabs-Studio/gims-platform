package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/product/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterProductCategoryRoutes(rg *gin.RouterGroup, h *handler.ProductCategoryHandler) {
	g := rg.Group("/product-categories")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PUT("/:id", h.Update)
		g.DELETE("/:id", h.Delete)
	}
}
