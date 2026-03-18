package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterPurchaseReturnRoutes(r *gin.RouterGroup, h *handler.PurchaseReturnHandler) {
	g := r.Group("/returns")
	g.GET("/form-data", middleware.RequirePermission("purchase_return.read"), h.GetFormData)
	g.GET("", middleware.RequirePermission("purchase_return.read"), h.List)
	g.POST("", middleware.RequirePermission("purchase_return.create"), h.Create)
	g.GET("/:id", middleware.RequirePermission("purchase_return.read"), h.GetByID)
}
