package router

import (
	"github.com/gilabs/gims/api/internal/general/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterOnboardingRoutes registers tenant onboarding state routes.
func RegisterOnboardingRoutes(rg *gin.RouterGroup, h *handler.OnboardingHandler) {
	g := rg.Group("/onboarding")
	{
		g.GET("", h.GetState)
		g.PUT("/business-type", h.SetBusinessType)
		g.PUT("/complete", h.MarkComplete)
	}
}
