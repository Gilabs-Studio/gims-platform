package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	cashBankRead   = "cash_bank.read"
	cashBankCreate = "cash_bank.create"
	cashBankUpdate = "cash_bank.update"
	cashBankDelete = "cash_bank.delete"
)

func RegisterCashBankJournalRoutes(r *gin.RouterGroup, h *handler.CashBankJournalHandler) {
	g := r.Group("/cash-bank")
	g.GET("", middleware.RequirePermission(cashBankRead), h.List)
	g.GET("/", middleware.RequirePermission(cashBankRead), h.List)
	g.POST("", middleware.RequirePermission(cashBankCreate), h.Create)
	g.POST("/", middleware.RequirePermission(cashBankCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(cashBankRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(cashBankUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(cashBankDelete), h.Delete)
	// NOTE: no cash_bank.post permission is seeded; use update for posting action
	g.POST("/:id/post", middleware.RequirePermission(cashBankUpdate), h.Post)
}
