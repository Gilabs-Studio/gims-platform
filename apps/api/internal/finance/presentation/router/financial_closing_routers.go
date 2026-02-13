package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	financialClosingRead    = "financial_closing.read"
	financialClosingCreate  = "financial_closing.create"
	financialClosingApprove = "financial_closing.approve"
)

func RegisterFinancialClosingRoutes(r *gin.RouterGroup, h *handler.FinancialClosingHandler) {
	g := r.Group("/closing")
	g.GET("", middleware.RequirePermission(financialClosingRead), h.List)
	g.GET("/", middleware.RequirePermission(financialClosingRead), h.List)
	g.POST("", middleware.RequirePermission(financialClosingCreate), h.Create)
	g.POST("/", middleware.RequirePermission(financialClosingCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(financialClosingRead), h.GetByID)
	g.POST("/:id/approve", middleware.RequirePermission(financialClosingApprove), h.Approve)
}
