package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/organization/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterEmployeeRoutes registers employee routes
func RegisterEmployeeRoutes(rg *gin.RouterGroup, h *handler.EmployeeHandler) {
	g := rg.Group("/employees")

	// Static routes BEFORE parameterized /:id to prevent path conflicts
	g.GET("/form-data", middleware.RequirePermission("employee.read"), h.GetFormData)

	g.GET("", middleware.RequirePermission("employee.read"), h.List)
	g.GET("/:id", middleware.RequirePermission("employee.read"), h.GetByID)
	g.POST("", middleware.RequirePermission("employee.create"), h.Create)
	g.PUT("/:id", middleware.RequirePermission("employee.update"), h.Update)
	g.DELETE("/:id", middleware.RequirePermission("employee.delete"), h.Delete)
	g.POST("/:id/submit", middleware.RequirePermission("employee.update"), h.SubmitForApproval)
	g.POST("/:id/approve", middleware.RequirePermission("employee.approve"), h.Approve)
	g.POST("/:id/areas", middleware.RequirePermission("employee.update"), h.AssignAreas)
	g.PUT("/:id/areas", middleware.RequirePermission("employee.update"), h.BulkUpdateAreas)
	g.DELETE("/:id/areas/:area_id", middleware.RequirePermission("employee.update"), h.RemoveAreaAssignment)
	g.POST("/:id/supervisor-areas", middleware.RequirePermission("employee.assign_area"), h.AssignSupervisorAreas)
}
