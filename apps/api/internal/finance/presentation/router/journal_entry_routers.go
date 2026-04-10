package router

import (
	"net/http"

	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/core/response"
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
	cashBankJournalRead      = "cash_bank_journal.read"
)

func deprecatedJournalRoute(message string, replacement string) gin.HandlerFunc {
	return func(c *gin.Context) {
		details := map[string]interface{}{}
		if replacement != "" {
			details["replacement"] = replacement
		}

		response.ErrorResponse(
			c,
			http.StatusGone,
			"FINANCE_ROUTE_DEPRECATED",
			message,
			details,
			nil,
		)
	}
}

func RegisterJournalEntryRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	registerJournalEntryRoutesInGroup(rg.Group("/journal-entries"), h)
	registerJournalEntryRoutesInGroup(rg.Group("/accounting/journal-entries"), h)
}

func registerJournalEntryRoutesInGroup(g *gin.RouterGroup, h *handler.JournalEntryHandler) {
	// CRITICAL: Place form-data BEFORE parameterized routes (/:id) for route specificity
	g.GET("/form-data", middleware.RequirePermission(journalRead), h.GetFormData)
	g.GET("", middleware.RequirePermission(journalRead), h.List)
	g.GET("/", middleware.RequirePermission(journalRead), h.List)
	g.POST("", deprecatedJournalRoute("Direct journal entry creation from Finance is deprecated. Use Adjustment Journal for manual entries.", "/finance/accounting/journal-entries/adjustment"))
	g.POST("/", deprecatedJournalRoute("Direct journal entry creation from Finance is deprecated. Use Adjustment Journal for manual entries.", "/finance/accounting/journal-entries/adjustment"))

	// Domain-specific read-only journal endpoints
	g.GET("/sales", middleware.RequirePermission(salesJournalRead), h.ListSalesJournals)
	g.GET("/purchase", middleware.RequirePermission(purchaseJournalRead), h.ListPurchaseJournals)
	g.GET("/cash-bank", middleware.RequirePermission(cashBankJournalRead), h.ListCashBankSubLedger)
	g.Any("/inventory", deprecatedJournalRoute("Inventory journal endpoint was moved out of Finance module.", "/stock"))
	g.Any("/inventory/*path", deprecatedJournalRoute("Inventory journal endpoint was moved out of Finance module.", "/stock"))
	g.Any("/valuation", deprecatedJournalRoute("Journal valuation endpoint was moved out of Finance module.", "/stock"))
	g.Any("/valuation/*path", deprecatedJournalRoute("Journal valuation endpoint was moved out of Finance module.", "/stock"))

	// Adjustment journal endpoints (operational, Finance-controlled)
	g.GET("/adjustment", middleware.RequirePermission(adjustmentJournalRead), h.ListAdjustmentJournals)
	g.POST("/adjustment", middleware.RequirePermission(adjustmentJournalCreate), h.CreateAdjustment)
	g.PUT("/adjustment/:id", middleware.RequirePermission(adjustmentJournalUpdate), h.UpdateAdjustment)
	g.POST("/adjustment/:id/post", middleware.RequirePermission(adjustmentJournalPost), h.PostAdjustment)
	g.POST("/adjustment/:id/reverse", middleware.RequirePermission(adjustmentJournalReverse), h.ReverseAdjustment)
	g.GET("/:id", middleware.RequirePermission(journalRead), h.GetByID)
	g.PUT("/:id", deprecatedJournalRoute("Direct journal entry update from Finance is deprecated. Use Adjustment Journal workflow.", "/finance/accounting/journal-entries/adjustment"))
	g.DELETE("/:id", deprecatedJournalRoute("Direct journal entry deletion from Finance is deprecated. Use reversal workflow.", "/finance/accounting/journal-entries/adjustment"))
	g.POST("/:id/post", deprecatedJournalRoute("Direct journal entry posting from this endpoint is deprecated.", "/finance/accounting/journal-entries/adjustment"))
	g.POST("/:id/reverse", deprecatedJournalRoute("Direct journal entry reversal from this endpoint is deprecated.", "/finance/accounting/journal-entries/adjustment"))
}
