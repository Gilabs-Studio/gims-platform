package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterEmployeeEducationHistoryRoutes(router *gin.RouterGroup, handler *handler.EmployeeEducationHistoryHandler, authMiddleware gin.HandlerFunc) {
	educations := router.Group("/employee-education-histories")
	educations.Use(authMiddleware)
	{
		// Form data
		educations.GET("/form-data", middleware.RequirePermission("education_history.read"), handler.GetFormData)

		// List and filters
		educations.GET("", middleware.RequirePermission("education_history.read"), handler.GetAll)
		educations.GET("/employee/:employee_id", middleware.RequirePermission("education_history.read"), handler.GetByEmployeeID)

		// CRUD
		educations.GET("/:id", middleware.RequirePermission("education_history.read"), handler.GetByID)
		educations.POST("", middleware.RequirePermission("education_history.create"), handler.Create)
		educations.PUT("/:id", middleware.RequirePermission("education_history.update"), handler.Update)
		educations.DELETE("/:id", middleware.RequirePermission("education_history.delete"), handler.Delete)
	}
}
