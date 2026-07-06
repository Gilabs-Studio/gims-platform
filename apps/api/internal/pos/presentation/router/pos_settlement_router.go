package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gin-gonic/gin"
)

func RegisterPOSSettlementRoutes(rg *gin.RouterGroup, h *handler.POSSettlementHandler) {
	settlement := rg.Group("/settlement")
	settlement.Use(middleware.RequirePermission("pos.payment.manage"))

	settlement.GET("/overview", h.GetOverview)
	settlement.GET("/payout-channels", h.GetPayoutChannels)
	settlement.GET("/payouts", h.GetPayouts)
	settlement.POST("/validate-bank-account", h.ValidateBankAccount)
	settlement.POST("/payouts/request-otp", h.RequestPayoutOTP)
	settlement.POST("/payouts", middleware.IdempotentRequest(), h.CreatePayout)
}
