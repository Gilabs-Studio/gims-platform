package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/finance/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterSystemAccountMappingRoutes(group *gin.RouterGroup, h *handler.SystemAccountMappingHandler) {
	mappings := group.Group("/settings/account-mappings")

	mappings.GET("",
		middleware.RequirePermission("account_mappings.read"),
		h.List,
	)
	mappings.GET("/:key",
		middleware.RequirePermission("account_mappings.read"),
		h.GetByKey,
	)
	mappings.PUT("/:key",
		middleware.RequirePermission("account_mappings.update"),
		h.Upsert,
	)
	mappings.DELETE("/:key",
		middleware.RequirePermission("account_mappings.delete"),
		h.Delete,
	)
}
