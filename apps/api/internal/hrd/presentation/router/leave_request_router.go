package router

import (
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterLeaveRequestRoutes registers all leave request routes
func RegisterLeaveRequestRoutes(r *gin.RouterGroup, leaveRequestHandler *handler.LeaveRequestHandler) {
	leaveRequests := r.Group("/leave-requests")
	{
		// Form data endpoint (must come before /:id to avoid route conflicts)
		leaveRequests.GET("/form-data", leaveRequestHandler.GetFormData) // Get form dropdown data

		// CRUD endpoints (auth already applied at parent group level)
		leaveRequests.POST("", leaveRequestHandler.Create)       // Create new leave request
		leaveRequests.GET("", leaveRequestHandler.List)          // List with filters
		leaveRequests.GET("/:id", leaveRequestHandler.GetByID)   // Get by ID
		leaveRequests.PUT("/:id", leaveRequestHandler.Update)    // Update existing
		leaveRequests.DELETE("/:id", leaveRequestHandler.Delete) // Soft delete

		// Balance endpoint
		leaveRequests.GET("/balance/:employee_id", leaveRequestHandler.GetBalance) // Get leave balance

		// Approval workflow endpoints
		leaveRequests.POST("/:id/approve", leaveRequestHandler.Approve) // Approve request
		leaveRequests.POST("/:id/reject", leaveRequestHandler.Reject)   // Reject request
	}
}
