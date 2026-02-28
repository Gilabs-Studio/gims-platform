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
		// Self-service endpoints (employee own leave requests)
		leaveRequests.GET("/self", leaveRequestHandler.ListSelf)
		leaveRequests.POST("/self", leaveRequestHandler.CreateSelf)
		leaveRequests.GET("/self/:id", leaveRequestHandler.GetSelfByID)
		leaveRequests.PUT("/self/:id", leaveRequestHandler.UpdateSelf)
		leaveRequests.POST("/self/:id/cancel", leaveRequestHandler.CancelSelf)
		leaveRequests.GET("/my-balance", leaveRequestHandler.GetMyBalance)
		leaveRequests.GET("/my-form-data", leaveRequestHandler.GetMyFormData)

		// Form data endpoint (must come before /:id to avoid route conflicts)
		// Requires leave.read permission to access dropdown options
		leaveRequests.GET("/form-data", middleware.RequirePermission("leave_request.read"), leaveRequestHandler.GetFormData)

		// CRUD endpoints - Only HR/approvers with appropriate permissions can manage leave requests
		leaveRequests.POST("", middleware.RequirePermission("leave_request.create"), leaveRequestHandler.Create)       // Create new leave request
		leaveRequests.GET("", middleware.RequirePermission("leave_request.read"), leaveRequestHandler.List)            // List with filters
		leaveRequests.GET("/:id", middleware.RequirePermission("leave_request.read"), leaveRequestHandler.GetByID)     // Get by ID
		leaveRequests.PUT("/:id", middleware.RequirePermission("leave_request.update"), leaveRequestHandler.Update)    // Update existing
		leaveRequests.DELETE("/:id", middleware.RequirePermission("leave_request.delete"), leaveRequestHandler.Delete) // Soft delete

		// Balance endpoint - Requires read permission
		leaveRequests.GET("/balance/:employee_id", middleware.RequirePermission("leave_request.read"), leaveRequestHandler.GetBalance)
		leaveRequests.GET("/employee/:employee_id/balance", middleware.RequirePermission("leave_request.read"), leaveRequestHandler.GetBalance)

		// Approval workflow endpoints - Only approvers can approve/reject/cancel
		leaveRequests.POST("/:id/approve", middleware.RequirePermission("leave_request.approve"), leaveRequestHandler.Approve) // Approve request
		leaveRequests.POST("/:id/reject", middleware.RequirePermission("leave_request.approve"), leaveRequestHandler.Reject)   // Reject request
		leaveRequests.POST("/:id/cancel", middleware.RequirePermission("leave_request.approve"), leaveRequestHandler.Cancel)   // Cancel request
	}
}
