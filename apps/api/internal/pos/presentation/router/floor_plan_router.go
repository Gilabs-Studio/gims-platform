package router

import (
	"github.com/gin-gonic/gin"

	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
)

// RegisterFloorPlanRoutes sets up floor plan routes
func RegisterFloorPlanRoutes(rg *gin.RouterGroup, h *handler.FloorPlanHandler) {
	plans := rg.Group("/floor-plans")
	plans.Use(middleware.RequirePermission("pos.layout.manage"))

	// Static routes MUST come before parameterized routes
	plans.GET("/form-data", h.GetFormData)

	plans.POST("", h.Create)
	plans.GET("", h.List)
	plans.GET("/:id", h.GetByID)
	plans.PUT("/:id", h.Update)
	plans.PUT("/:id/layout", h.SaveLayoutData)
	plans.DELETE("/:id", h.Delete)
	plans.POST("/:id/publish", h.Publish)
	plans.GET("/:id/versions", h.ListVersions)
}
