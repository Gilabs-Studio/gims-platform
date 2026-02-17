package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	journalRead   = "journal.read"
	journalCreate = "journal.create"
	journalUpdate = "journal.update"
	journalDelete = "journal.delete"
	journalPost   = "journal.post"
)

func RegisterJournalEntryRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	g := rg.Group("/journal-entries")
	g.GET("", middleware.RequirePermission(journalRead), h.List)
	g.GET("/", middleware.RequirePermission(journalRead), h.List)
	g.POST("", middleware.RequirePermission(journalCreate), h.Create)
	g.POST("/", middleware.RequirePermission(journalCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(journalRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(journalUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(journalDelete), h.Delete)
	g.POST("/:id/post", middleware.RequirePermission(journalPost), h.Post)
}

func RegisterFinanceReportRoutes(rg *gin.RouterGroup, h *handler.JournalEntryHandler) {
	g := rg.Group("/reports")
	// Reuse journal.read to allow journal users to view trial balance
	g.GET("/trial-balance", middleware.RequirePermission(journalRead), h.TrialBalance)
}
