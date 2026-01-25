package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterYearlyTargetRoutes registers yearly target routes
func RegisterYearlyTargetRoutes(rg *gin.RouterGroup, h *handler.YearlyTargetHandler) {
	g := rg.Group("/yearly-targets")
	g.GET("", middleware.RequirePermission("yearly_target.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("yearly_target.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("yearly_target.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("yearly_target.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("yearly_target.delete"), h.Delete)
	g.PATCH("/:id/status", middleware.RequirePermission("yearly_target.update"), h.UpdateStatus)
}
