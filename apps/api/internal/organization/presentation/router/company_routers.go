package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/organization/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterCompanyRoutes registers company routes
func RegisterCompanyRoutes(rg *gin.RouterGroup, h *handler.CompanyHandler) {
	g := rg.Group("/companies")
	g.GET("", middleware.RequirePermission("company.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("company.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("company.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("company.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("company.delete"), h.Delete)
	// Approval workflow endpoints
	g.POST("/:id/submit", middleware.RequirePermission("company.update"), h.SubmitForApproval)
	g.POST("/:id/approve", middleware.RequirePermission("company.approve"), h.Approve)
}
