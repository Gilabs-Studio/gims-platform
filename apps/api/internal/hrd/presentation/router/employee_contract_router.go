package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/hrd/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterEmployeeContractRoutes(router *gin.RouterGroup, handler *handler.EmployeeContractHandler, authMiddleware gin.HandlerFunc) {
	contracts := router.Group("/employee-contracts")
	contracts.Use(authMiddleware)
	{
		// Form data
		contracts.GET("/form-data", middleware.RequirePermission("employee_contract.read"), handler.GetFormData)

		// List and filters
		contracts.GET("", middleware.RequirePermission("employee_contract.read"), handler.GetAll)
		contracts.GET("/expiring", middleware.RequirePermission("employee_contract.read"), handler.GetExpiring)
		contracts.GET("/employee/:employee_id", middleware.RequirePermission("employee_contract.read"), handler.GetByEmployeeID)

		// CRUD
		contracts.GET("/:id", middleware.RequirePermission("employee_contract.read"), handler.GetByID)
		contracts.POST("", middleware.RequirePermission("employee_contract.create"), handler.Create)
		contracts.PUT("/:id", middleware.RequirePermission("employee_contract.update"), handler.Update)
		contracts.DELETE("/:id", middleware.RequirePermission("employee_contract.delete"), handler.Delete)
	}
}
