package router

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/jwt"
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/referral/presentation/handler"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gin-gonic/gin"
)

func RegisterSystemAdminRoutes(r *gin.Engine, h *handler.Handler, jwtManager *jwt.JWTManager, sysAdminRepo tenantRepos.SystemAdminRepository) {
	internal := r.Group("/internal")
	protected := internal.Group("/referrals")
	protected.Use(middleware.SystemAdminAuthMiddleware(jwtManager, sysAdminRepo))
	{
		protected.GET("/stats", h.GetStats)

		protected.GET("/accounts", h.ListAccounts)
		protected.POST("/accounts", h.CreateAccount)
		protected.PUT("/accounts/:id", h.UpdateAccount)
		protected.DELETE("/accounts/:id", h.DeleteAccount)

		protected.GET("/codes", h.ListCodes)
		protected.POST("/codes", h.CreateCode)
		protected.PUT("/codes/:id", h.UpdateCode)
		protected.PATCH("/codes/:id/status", h.SetCodeStatus)
		protected.DELETE("/codes/:id", h.DeleteCode)
	}
}
