package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	permissionHandler "github.com/gilabs/crm-healthcare/api/internal/permission/presentation/handler"
	"github.com/gilabs/crm-healthcare/api/internal/user/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(rg *gin.RouterGroup, h *handler.UserHandler, ph *permissionHandler.PermissionHandler, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	g := rg.Group("/users")
	g.Use(middleware.AuthMiddleware(jwtManager, permService))
	{
		g.GET("", middleware.RequirePermission("user.read"), h.List)
		g.GET("/:id", middleware.RequirePermission("user.read"), h.GetByID)
		g.POST("", middleware.RequirePermission("user.create"), h.Create)
		g.PUT("/:id", middleware.RequirePermission("user.update"), h.Update)
		g.DELETE("/:id", middleware.RequirePermission("user.delete"), h.Delete)

		// Add permissions route
		g.GET("/:id/permissions", middleware.RequirePermission("user.read"), ph.GetUserPermissions)
	}
}
