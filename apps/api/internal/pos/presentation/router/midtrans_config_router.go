package router

import (
	"github.com/gin-gonic/gin"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
)

// RegisterMidtransConfigRoutes registers Midtrans gateway configuration routes
func RegisterMidtransConfigRoutes(rg *gin.RouterGroup, h *handler.MidtransConfigHandler) {
	midtrans := rg.Group("/midtrans")
	midtrans.Use(middleware.RequirePermission("pos.midtrans.manage"))

	midtrans.GET("", h.Get)
	midtrans.PUT("", h.Upsert)
}
