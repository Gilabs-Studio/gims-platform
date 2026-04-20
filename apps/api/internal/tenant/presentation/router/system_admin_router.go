package router

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterSystemAdminRoutes registers all system admin routes under /internal
// These routes are completely separate from tenant API routes.
func RegisterSystemAdminRoutes(r *gin.Engine, h *handler.SystemAdminHandler, jwtManager *jwt.JWTManager, sysAdminRepo repositories.SystemAdminRepository) {
	internal := r.Group("/internal")
	{
		// Public system admin auth (rate-limited)
		internal.POST("/sys-login", middleware.RateLimitMiddleware("login"), h.Login)

		// Protected system admin routes
		protected := internal.Group("")
		protected.Use(middleware.SystemAdminAuthMiddleware(jwtManager, sysAdminRepo))
		{
			protected.GET("/me", h.Me)
			protected.POST("/sys-logout", h.Logout)
			protected.GET("/system-dashboard", h.Dashboard)
			protected.GET("/tenants", h.ListTenants)
			protected.GET("/tenants/:id", h.GetTenantDetail)
		}
	}
}
