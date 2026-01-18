package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/organization/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterEmployeeRoutes registers employee routes
func RegisterEmployeeRoutes(rg *gin.RouterGroup, h *handler.EmployeeHandler) {
	g := rg.Group("/employees")
	g.GET("", middleware.RequirePermission("employee.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("employee.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("employee.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("employee.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("employee.delete"), h.Delete)
	g.POST("/:id/submit", middleware.RequirePermission("employee.update"), h.SubmitForApproval)
	g.POST("/:id/approve", middleware.RequirePermission("employee.approve"), h.Approve)
	g.POST("/:id/areas", middleware.RequirePermission("employee.update"), h.AssignAreas)
}
