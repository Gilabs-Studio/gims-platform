package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterLeaveRequestRoutes registers all leave request routes with permission-based access control
func RegisterLeaveRequestRoutes(r *gin.RouterGroup, leaveRequestHandler *handler.LeaveRequestHandler) {
	leaveRequests := r.Group("/leave-requests")
	{
		// Form data endpoint (must come before /:id to avoid route conflicts)
		// Requires leave.read permission to access dropdown options
		leaveRequests.GET("/form-data", middleware.RequirePermission("leave.read"), leaveRequestHandler.GetFormData)

		// CRUD endpoints - Only HR/approvers with appropriate permissions can manage leave requests
		leaveRequests.POST("", middleware.RequirePermission("leave.create"), leaveRequestHandler.Create)       // Create new leave request
		leaveRequests.GET("", middleware.RequirePermission("leave.read"), leaveRequestHandler.List)            // List with filters
		leaveRequests.GET("/:id", middleware.RequirePermission("leave.read"), leaveRequestHandler.GetByID)     // Get by ID
		leaveRequests.PUT("/:id", middleware.RequirePermission("leave.update"), leaveRequestHandler.Update)    // Update existing
		leaveRequests.DELETE("/:id", middleware.RequirePermission("leave.delete"), leaveRequestHandler.Delete) // Soft delete

		// Balance endpoint - Requires read permission
		leaveRequests.GET("/balance/:employee_id", middleware.RequirePermission("leave.read"), leaveRequestHandler.GetBalance)

		// Approval workflow endpoints - Only approvers can approve/reject/cancel
		leaveRequests.POST("/:id/approve", middleware.RequirePermission("leave.approve"), leaveRequestHandler.Approve) // Approve request
		leaveRequests.POST("/:id/reject", middleware.RequirePermission("leave.approve"), leaveRequestHandler.Reject)   // Reject request
		leaveRequests.POST("/:id/cancel", middleware.RequirePermission("leave.approve"), leaveRequestHandler.Cancel)   // Cancel request
	}
}
