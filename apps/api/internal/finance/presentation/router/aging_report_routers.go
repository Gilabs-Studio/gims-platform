package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterFinanceAgingReportRoutes(rg *gin.RouterGroup, h *handler.AgingReportHandler) {
	g := rg.Group("/reports")
	// No explicit aging permissions are seeded; use journal.read to allow finance report viewing.
	g.GET("/ar-aging", middleware.RequirePermission(journalRead), h.ARAging)
	g.GET("/ap-aging", middleware.RequirePermission(journalRead), h.APAging)
}
