package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterFinanceSettingsRoutes(
	group *gin.RouterGroup,
	h *handler.FinanceSettingsHandler,
) {
	settingsGroup := group.Group("/settings")

	settingsGroup.GET("",
		middleware.RequirePermission("finance_settings.read"),
		h.GetAll,
	)

	settingsGroup.PUT("",
		middleware.RequirePermission("finance_settings.update"),
		h.BatchUpsert,
	)
}
