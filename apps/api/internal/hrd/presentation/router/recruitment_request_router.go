package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// SetupRecruitmentRequestRoutes registers all recruitment request routes
func SetupRecruitmentRequestRoutes(router *gin.RouterGroup, h *handler.RecruitmentRequestHandler) {
	recruitment := router.Group("/recruitment-requests")
	{
		// CRITICAL: form-data before /:id to avoid route conflicts
		recruitment.GET("/form-data", middleware.RequirePermission("recruitment.read"), h.GetFormData)
		recruitment.GET("", middleware.RequirePermission("recruitment.read"), h.GetAll)
		recruitment.GET("/:id", middleware.RequirePermission("recruitment.read"), h.GetByID)
		recruitment.POST("", middleware.RequirePermission("recruitment.create"), h.Create)
		recruitment.PUT("/:id", middleware.RequirePermission("recruitment.update"), h.Update)
		recruitment.DELETE("/:id", middleware.RequirePermission("recruitment.delete"), h.Delete)

		// Status workflow
		recruitment.POST("/:id/status", middleware.RequirePermission("recruitment.update"), h.UpdateStatus)

		// Filled count management
		recruitment.PUT("/:id/filled-count", middleware.RequirePermission("recruitment.update"), h.UpdateFilledCount)
	}
}
