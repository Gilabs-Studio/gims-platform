package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/sales/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterYearlyTargetRoutes registers yearly target routes
func RegisterYearlyTargetRoutes(rg *gin.RouterGroup, h *handler.YearlyTargetHandler) {
	g := rg.Group("/yearly-targets")
	g.GET("", middleware.RequirePermission("sales_target.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("sales_target.read"), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission("sales_target.audit_trail"), h.AuditTrail)
	g.POST("", middleware.RequirePermission("sales_target.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("sales_target.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("sales_target.delete"), h.Delete)
}
