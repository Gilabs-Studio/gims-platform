package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	nonTradePayableRead   = "non_trade_payable.read"
	nonTradePayableCreate = "non_trade_payable.create"
	nonTradePayableUpdate = "non_trade_payable.update"
	nonTradePayableDelete = "non_trade_payable.delete"
)

func RegisterNonTradePayableRoutes(r *gin.RouterGroup, h *handler.NonTradePayableHandler) {
	g := r.Group("/non-trade-payables")
	g.GET("", middleware.RequirePermission(nonTradePayableRead), h.List)
	g.GET("/", middleware.RequirePermission(nonTradePayableRead), h.List)
	g.POST("", middleware.RequirePermission(nonTradePayableCreate), h.Create)
	g.POST("/", middleware.RequirePermission(nonTradePayableCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(nonTradePayableRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(nonTradePayableUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(nonTradePayableDelete), h.Delete)
}
