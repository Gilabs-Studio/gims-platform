package router

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/stock_opname/presentation/handler"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PermissionService interface matches what middleware needs
type PermissionService interface {
	GetPermissions(roleCode string) ([]string, error)
	GetPermissionsWithScope(roleCode string) (map[string]string, error)
}

func RegisterStockOpnameRoutes(
	r *gin.RouterGroup,
	h *handler.StockOpnameHandler,
	jwtManager *jwt.JWTManager,
	permService PermissionService,
	db *gorm.DB,
) {
	group := r.Group("/stock-opnames")
	group.Use(middleware.AuthMiddleware(jwtManager, permService))
	group.Use(middleware.ScopeMiddleware(db))

	group.GET("", h.List)
	group.POST("", h.Create)
	group.GET("/:id", h.GetByID)
	group.PUT("/:id", h.Update)
	group.DELETE("/:id", h.Delete)
	
	// Items
	group.GET("/:id/items", h.ListItems)
	group.PUT("/:id/items", h.SaveItems)

	// Status
	group.POST("/:id/status", h.UpdateStatus)
}
