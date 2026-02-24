package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterFinanceReportExRoutes(rg *gin.RouterGroup, h *handler.FinanceReportHandler) {
	g := rg.Group("/reports")
	// Use journal.read permission for now or specific report permission
	g.GET("/general-ledger", middleware.RequirePermission("journal.read"), h.GeneralLedger)
	g.GET("/balance-sheet", middleware.RequirePermission("journal.read"), h.BalanceSheet)
	g.GET("/profit-loss", middleware.RequirePermission("journal.read"), h.ProfitAndLoss)
	g.GET("/export/general-ledger", middleware.RequirePermission("journal.read"), h.ExportGeneralLedger)
	g.GET("/export/balance-sheet", middleware.RequirePermission("journal.read"), h.ExportBalanceSheet)
	g.GET("/export/profit-loss", middleware.RequirePermission("journal.read"), h.ExportProfitAndLoss)
}
