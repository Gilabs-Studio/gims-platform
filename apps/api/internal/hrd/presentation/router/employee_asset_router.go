package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

// SetupEmployeeAssetRoutes sets up routes for employee asset management
func SetupEmployeeAssetRoutes(router *gin.RouterGroup, handler *handler.EmployeeAssetHandler) {
	assets := router.Group("/employee-assets")
	{
		// Form data endpoint (auth only, no specific permission)
		assets.GET("/form-data", handler.GetFormData)

		// Get borrowed assets (must be before /:id for route specificity)
		assets.GET("/borrowed", middleware.RequirePermission("employee_asset.read"), handler.GetBorrowed)

		// Get by employee ID (must be before /:id for route specificity)
		assets.GET("/employee/:employee_id", middleware.RequirePermission("employee_asset.read"), handler.GetByEmployeeID)

		// CRUD routes
		assets.GET("", middleware.RequirePermission("employee_asset.read"), handler.GetAll)
		assets.GET("/:id", middleware.RequirePermission("employee_asset.read"), handler.GetByID)
		assets.POST("", middleware.RequirePermission("employee_asset.create"), handler.Create)
		assets.PUT("/:id", middleware.RequirePermission("employee_asset.update"), handler.Update)
		assets.DELETE("/:id", middleware.RequirePermission("employee_asset.delete"), handler.Delete)

		// Return asset action
		assets.POST("/:id/return", middleware.RequirePermission("employee_asset.update"), handler.ReturnAsset)
	}
}
