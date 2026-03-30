package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/travel_planner/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterTravelPlanRoutes(r *gin.RouterGroup, h *handler.TravelPlanHandler) {
	// Fixed routes before /plans/:id to avoid route shadowing.
	r.GET("/form-data", middleware.RequirePermission("up_country_cost.read"), h.GetFormData)
	r.GET("/place-search", middleware.RequirePermission("up_country_cost.read"), h.SearchPlaces)

	plans := r.Group("/plans")
	{
		plans.GET("", middleware.RequirePermission("up_country_cost.read"), h.List)
		plans.POST("", middleware.RequirePermission("up_country_cost.create"), h.Create)

		plans.GET("/:id", middleware.RequirePermission("up_country_cost.read"), h.GetByID)
		plans.PUT("/:id", middleware.RequirePermission("up_country_cost.update"), h.Update)
		plans.DELETE("/:id", middleware.RequirePermission("up_country_cost.delete"), h.Delete)

		plans.POST("/:id/optimize-route", middleware.RequirePermission("up_country_cost.update"), h.OptimizeRoute)
		plans.GET("/:id/weather", middleware.RequirePermission("up_country_cost.read"), h.GetWeather)
		plans.GET("/:id/google-maps-links", middleware.RequirePermission("up_country_cost.read"), h.GetGoogleMapsLinks)
		plans.GET("/:id/export/pdf", middleware.RequirePermission("up_country_cost.read"), h.ExportPDF)
	}
}
