package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	journalRead      = "journal.read"
	journalCreate    = "journal.create"
	journalUpdate    = "journal.update"
	journalDelete    = "journal.delete"
	journalPost      = "journal.post"
	journalReverse   = "journal.reverse"
	trialBalanceRead = "trial_balance_report.read"
)

func RegisterJournalEntryRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	g := rg.Group("/journal-entries")
	// CRITICAL: Place form-data BEFORE parameterized routes (/:id) for route specificity
	g.GET("/form-data", middleware.RequirePermission(journalRead), h.GetFormData)
	g.GET("", middleware.RequirePermission(journalRead), h.List)
	g.GET("/", middleware.RequirePermission(journalRead), h.List)
	g.GET("/sales", middleware.RequirePermission(journalRead), h.ListSalesJournals)
	g.GET("/purchase", middleware.RequirePermission(journalRead), h.ListPurchaseJournals)
	g.GET("/inventory", middleware.RequirePermission(journalRead), h.ListInventoryJournals)
	g.GET("/cash-bank", middleware.RequirePermission(journalRead), h.ListCashBankJournals)
	g.POST("", middleware.RequirePermission(journalCreate), h.Create)
	g.POST("/", middleware.RequirePermission(journalCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(journalRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(journalUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(journalDelete), h.Delete)
	g.POST("/:id/post", middleware.RequirePermission(journalPost), h.Post)
	g.POST("/:id/reverse", middleware.RequirePermission(journalReverse), h.Reverse)
}

func RegisterFinanceReportRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	g := rg.Group("/reports")
	g.GET("/trial-balance", middleware.RequirePermission(trialBalanceRead), h.TrialBalance)
}
