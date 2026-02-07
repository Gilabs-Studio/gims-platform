package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// SetupEmployeeCertificationRoutes sets up routes for employee certification management
func SetupEmployeeCertificationRoutes(router *gin.RouterGroup, handler *handler.EmployeeCertificationHandler, authMiddleware gin.HandlerFunc) {
	certifications := router.Group("/employee-certifications")
	certifications.Use(authMiddleware)
	{
		// Form data endpoint
		certifications.GET("/form-data", handler.GetFormData)

		// Expiring certifications - must be before /:id route
		certifications.GET("/expiring", middleware.RequirePermission("certification.read"), handler.GetExpiringCertifications)

		// Employee-specific certifications
		certifications.GET("/employee/:employee_id", middleware.RequirePermission("certification.read"), handler.GetCertificationsByEmployeeID)

		// CRUD operations
		certifications.POST("", middleware.RequirePermission("certification.create"), handler.CreateCertification)
		certifications.GET("", middleware.RequirePermission("certification.read"), handler.GetAllCertifications)
		certifications.GET("/:id", middleware.RequirePermission("certification.read"), handler.GetCertificationByID)
		certifications.PUT("/:id", middleware.RequirePermission("certification.update"), handler.UpdateCertification)
		certifications.DELETE("/:id", middleware.RequirePermission("certification.delete"), handler.DeleteCertification)
	}
}
