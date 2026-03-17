package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	journalRead              = "journal.read"
	salesJournalRead         = "sales_journal.read"
	purchaseJournalRead      = "purchase_journal.read"
	adjustmentJournalRead    = "adjustment_journal.read"
	adjustmentJournalCreate  = "adjustment_journal.create"
	adjustmentJournalUpdate  = "adjustment_journal.update"
	adjustmentJournalPost    = "adjustment_journal.post"
	adjustmentJournalReverse = "adjustment_journal.reverse"
	valuationJournalRead     = "journal_valuation.read"
	valuationJournalRun      = "journal_valuation.run"
	cashBankJournalRead      = "cash_bank_journal.read"
	journalCreate            = "journal.create"
	journalUpdate            = "journal.update"
	journalDelete            = "journal.delete"
	journalPost              = "journal.post"
	journalReverse           = "journal.reverse"
	trialBalanceRead         = "trial_balance_report.read"
)

func RegisterJournalEntryRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	g := rg.Group("/journal-entries")
	// CRITICAL: Place form-data BEFORE parameterized routes (/:id) for route specificity
	g.GET("/form-data", middleware.RequirePermission(journalRead), h.GetFormData)
	g.GET("", middleware.RequirePermission(journalRead), h.List)
	g.GET("/", middleware.RequirePermission(journalRead), h.List)

	// Domain-specific read-only journal endpoints
	g.GET("/sales", middleware.RequirePermission(salesJournalRead), h.ListSalesJournals)
	g.GET("/purchase", middleware.RequirePermission(purchaseJournalRead), h.ListPurchaseJournals)
	g.GET("/inventory", middleware.RequirePermission(journalRead), h.ListInventoryJournals)
	g.GET("/cash-bank", middleware.RequirePermission(cashBankJournalRead), h.ListCashBankSubLedger)

	// Adjustment journal endpoints (operational, Finance-controlled)
	g.GET("/adjustment", middleware.RequirePermission(adjustmentJournalRead), h.ListAdjustmentJournals)
	g.POST("/adjustment", middleware.RequirePermission(adjustmentJournalCreate), h.CreateAdjustment)
	g.PUT("/adjustment/:id", middleware.RequirePermission(adjustmentJournalUpdate), h.UpdateAdjustment)
	g.POST("/adjustment/:id/post", middleware.RequirePermission(adjustmentJournalPost), h.PostAdjustment)
	g.POST("/adjustment/:id/reverse", middleware.RequirePermission(adjustmentJournalReverse), h.ReverseAdjustment)

	// Valuation journal endpoints
	g.GET("/valuation", middleware.RequirePermission(valuationJournalRead), h.ListValuationJournals)
	g.POST("/valuation/run", middleware.RequirePermission(valuationJournalRun), h.RunValuation)
	g.GET("/valuation/runs", middleware.RequirePermission(valuationJournalRead), h.ListValuationRuns)
	g.GET("/valuation/runs/:id", middleware.RequirePermission(valuationJournalRead), h.GetValuationRun)

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
