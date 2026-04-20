package router

import (
	"github.com/gilabs/gims/api/internal/auth/presentation/handler"
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(rg *gin.RouterGroup, h *handler.AuthHandler, jwtManager *jwt.JWTManager, permissionService security.PermissionService) {
	g := rg.Group("/auth")
	{
		g.POST("/login", middleware.RateLimitMiddleware("login"), h.Login)
		g.POST("/refresh-token", middleware.RateLimitMiddleware("refresh"), h.RefreshToken)
		g.GET("/csrf", middleware.RateLimitMiddleware("public"), h.GetCSRFToken)
		// Self-service tenant registration — provisions a new tenant + enterprise admin
		// account and returns a JWT. No auth required.
		g.POST("/register", middleware.RateLimitMiddleware("login"), h.RegisterTenant)

		// Protected routes
		protected := g.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager, permissionService))
		{
			protected.POST("/logout", h.Logout)
		}
	}
}
