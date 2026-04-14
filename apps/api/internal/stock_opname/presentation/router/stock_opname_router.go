package router

import (
	"strings"

	"github.com/gilabs/gims/api/internal/core/errors"
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

func requireAnyPermission(permissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		perms, exists := c.Get("user_permissions")
		if !exists {
			errors.ForbiddenResponse(c, "permission check failed", nil)
			c.Abort()
			return
		}

		permMap, ok := perms.(map[string]bool)
		if !ok {
			errors.ForbiddenResponse(c, "permission format error", nil)
			c.Abort()
			return
		}

		for _, permission := range permissions {
			if permMap[permission] {
				c.Next()
				return
			}
		}

		errors.ForbiddenResponse(c, "Missing one of permissions: "+strings.Join(permissions, ", "), nil)
		c.Abort()
	}
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

	group.GET("", middleware.RequirePermission("stock_opname.read"), h.List)
	group.POST("", middleware.RequirePermission("stock_opname.create"), h.Create)
	group.GET("/:id", middleware.RequirePermission("stock_opname.read"), h.GetByID)
	group.PUT("/:id", middleware.RequirePermission("stock_opname.update"), h.Update)
	group.DELETE("/:id", middleware.RequirePermission("stock_opname.delete"), h.Delete)
	
	// Items
	group.GET("/:id/items", middleware.RequirePermission("stock_opname.read"), h.ListItems)
	group.PUT("/:id/items", middleware.RequirePermission("stock_opname.update"), h.SaveItems)

	// Status
	group.POST("/:id/status", requireAnyPermission("stock_opname.update", "stock_opname.approve", "stock_opname.reject", "stock_opname.post"), h.UpdateStatus)
}
