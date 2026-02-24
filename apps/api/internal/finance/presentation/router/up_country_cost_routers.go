package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	upCountryCostRead    = "up_country_cost.read"
	upCountryCostCreate  = "up_country_cost.create"
	upCountryCostUpdate  = "up_country_cost.update"
	upCountryCostDelete  = "up_country_cost.delete"
	upCountryCostApprove = "up_country_cost.approve"
)

func RegisterUpCountryCostRoutes(r *gin.RouterGroup, h *handler.UpCountryCostHandler) {
	g := r.Group("/up-country-costs")
	{
		g.GET("", middleware.RequirePermission(upCountryCostRead), h.List)
		g.POST("", middleware.RequirePermission(upCountryCostCreate), h.Create)
		g.GET("/:id", middleware.RequirePermission(upCountryCostRead), h.GetByID)
		g.PUT("/:id", middleware.RequirePermission(upCountryCostUpdate), h.Update)
		g.DELETE("/:id", middleware.RequirePermission(upCountryCostDelete), h.Delete)
		g.POST("/:id/approve", middleware.RequirePermission(upCountryCostApprove), h.Approve)
	}
}
