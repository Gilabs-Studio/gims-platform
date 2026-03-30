package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/travel_planner/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterTravelPlanRoutes(r *gin.RouterGroup, h *handler.TravelPlanHandler) {
	// Fixed routes before /plans/:id to avoid route shadowing.
	r.GET("/form-data", middleware.RequirePermission("travel_planner.read"), h.GetFormData)
	r.GET("/place-search", middleware.RequirePermission("travel_planner.read"), h.SearchPlaces)
	r.GET("/visits/available", middleware.RequirePermission("travel_planner.read"), h.ListAvailableVisits)

	plans := r.Group("/plans")
	{
		plans.GET("", middleware.RequirePermission("travel_planner.read"), h.List)
		plans.POST("", middleware.RequirePermission("travel_planner.create"), h.Create)

		plans.GET("/:id", middleware.RequirePermission("travel_planner.read"), h.GetByID)
		plans.PUT("/:id", middleware.RequirePermission("travel_planner.update"), h.Update)
		plans.DELETE("/:id", middleware.RequirePermission("travel_planner.delete"), h.Delete)

		plans.POST("/:id/optimize-route", middleware.RequirePermission("travel_planner.update"), h.OptimizeRoute)
		plans.GET("/:id/weather", middleware.RequirePermission("travel_planner.read"), h.GetWeather)
		plans.GET("/:id/google-maps-links", middleware.RequirePermission("travel_planner.read"), h.GetGoogleMapsLinks)
		plans.GET("/:id/export/pdf", middleware.RequirePermission("travel_planner.read"), h.ExportPDF)

		plans.GET("/:id/expenses", middleware.RequirePermission("travel_planner.read"), h.ListExpenses)
		plans.POST("/:id/expenses", middleware.RequirePermission("travel_planner.update"), h.CreateExpense)
		plans.DELETE("/:id/expenses/:expenseId", middleware.RequirePermission("travel_planner.delete"), h.DeleteExpense)

		plans.GET("/:id/visits", middleware.RequirePermission("travel_planner.read"), h.ListVisits)
		plans.POST("/:id/visits", middleware.RequirePermission("travel_planner.create"), h.CreateVisitFromTrip)
		plans.POST("/:id/visits/link", middleware.RequirePermission("travel_planner.update"), h.LinkVisits)
		plans.DELETE("/:id/visits/:visitId", middleware.RequirePermission("travel_planner.update"), h.UnlinkVisit)
	}
}
