package router

import (
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/crm-healthcare/api/internal/core/middleware"
	"github.com/gilabs/crm-healthcare/api/internal/role/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterRoleRoutes(rg *gin.RouterGroup, h *handler.RoleHandler, jwtManager *jwt.JWTManager, permService interface {
	GetPermissions(roleCode string) ([]string, error)
}) {
	g := rg.Group("/roles")
	g.Use(middleware.AuthMiddleware(jwtManager, permService))
	{
		g.GET("", middleware.RequirePermission("role.read"), h.List)
		g.GET("/:id", middleware.RequirePermission("role.read"), h.GetByID)
		g.POST("", middleware.RequirePermission("role.create"), h.Create)
		g.PUT("/:id", middleware.RequirePermission("role.update"), h.Update)
		g.DELETE("/:id", middleware.RequirePermission("role.delete"), h.Delete)
		g.POST("/:id/permissions", middleware.RequirePermission("role.assign_permissions"), h.AssignPermissions)
		g.GET("/validate", h.ValidateUserRole)
	}
}
