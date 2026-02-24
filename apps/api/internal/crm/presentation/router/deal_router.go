package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/crm/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	dealRead      = "crm_deal.read"
	dealCreate    = "crm_deal.create"
	dealUpdate    = "crm_deal.update"
	dealDelete    = "crm_deal.delete"
	dealMoveStage = "crm_deal.move_stage"
)

// RegisterDealRoutes registers all deal-related routes
func RegisterDealRoutes(r *gin.RouterGroup, h *handler.DealHandler) {
	g := r.Group("/deals")

	// Static routes first (before parameterized routes)
	g.GET("/form-data", middleware.RequirePermission(dealRead), h.GetFormData)
	g.GET("/by-stage", middleware.RequirePermission(dealRead), h.ListByStage)
	g.GET("/summary", middleware.RequirePermission(dealRead), h.GetPipelineSummary)
	g.GET("/forecast", middleware.RequirePermission(dealRead), h.GetForecast)

	// CRUD routes
	g.GET("", middleware.RequirePermission(dealRead), h.List)
	g.POST("", middleware.RequirePermission(dealCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(dealRead), h.GetByID)
	g.PUT("/:id", middleware.RequirePermission(dealUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(dealDelete), h.Delete)

	// Special actions
	g.POST("/:id/move-stage", middleware.RequirePermission(dealMoveStage), h.MoveStage)
	g.GET("/:id/history", middleware.RequirePermission(dealRead), h.GetHistory)
}
