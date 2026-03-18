package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterSalesReturnRoutes(rg *gin.RouterGroup, h *handler.SalesReturnHandler) {
	g := rg.Group("/returns")
	g.GET("/form-data", middleware.RequirePermission("sales_return.read"), h.GetFormData)
	g.GET("", middleware.RequirePermission("sales_return.read"), h.List)
	g.POST("", middleware.RequirePermission("sales_return.create"), h.Create)
	g.GET("/:id", middleware.RequirePermission("sales_return.read"), h.GetByID)
}
