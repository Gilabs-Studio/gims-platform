package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/core/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	bankAccountRead   = "bank_account.read"
	bankAccountCreate = "bank_account.create"
	bankAccountUpdate = "bank_account.update"
	bankAccountDelete = "bank_account.delete"
)

func RegisterBankAccountRoutes(rg *gin.RouterGroup, h *handler.BankAccountHandler) {
	g := rg.Group("/bank-accounts")
	{
		g.POST("", middleware.RequirePermission(bankAccountCreate), h.Create)
		g.GET("", middleware.RequirePermission(bankAccountRead), h.List)
		g.GET("/unified", middleware.RequirePermission(bankAccountRead), h.ListUnified)
		g.GET("/:id/transaction-history", middleware.RequirePermission(bankAccountRead), h.ListTransactionHistory)
		g.GET("/:id", middleware.RequirePermission(bankAccountRead), h.GetByID)
		g.PUT("/:id", middleware.RequirePermission(bankAccountUpdate), h.Update)
		g.DELETE("/:id", middleware.RequirePermission(bankAccountDelete), h.Delete)
	}
}
