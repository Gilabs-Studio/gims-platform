package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterFinanceReportExRoutes(rg *gin.RouterGroup, h *handler.FinanceReportHandler) {
	g := rg.Group("/reports")
	g.GET("/general-ledger", middleware.RequirePermission("finance_report.gl"), h.GeneralLedger)
	g.GET("/balance-sheet", middleware.RequirePermission("finance_report.bs"), h.BalanceSheet)
	g.GET("/profit-loss", middleware.RequirePermission("finance_report.pl"), h.ProfitAndLoss)
	g.GET("/export/general-ledger", middleware.RequirePermission("finance_report.export_gl"), h.ExportGeneralLedger)
	g.GET("/export/balance-sheet", middleware.RequirePermission("finance_report.export_bs"), h.ExportBalanceSheet)
	g.GET("/export/profit-loss", middleware.RequirePermission("finance_report.export_pl"), h.ExportProfitAndLoss)
}
