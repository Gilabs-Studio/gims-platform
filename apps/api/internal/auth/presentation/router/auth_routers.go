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
		// Self-service tenant registration — requires a valid coupon or a selected subscription plan.
		g.POST("/register", middleware.RateLimitMiddleware("login"), h.RegisterTenant)
		// Public coupon validation — accepts optional ?email= to check the one-time-per-email rule.
		g.GET("/coupons/validate", middleware.RateLimitMiddleware("public"), h.ValidateCoupon)

		// Protected routes
		protected := g.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager, permissionService))
		{
			protected.POST("/logout", h.Logout)
		}
	}
}

// RegisterWebhookRoutes registers inbound webhook handlers (no auth middleware — verified by token header).
func RegisterWebhookRoutes(rg *gin.RouterGroup, h *handler.XenditHandler) {
	g := rg.Group("/webhooks/xendit")
	{
		g.POST("/invoice", h.InvoicePaid)
	}
}

