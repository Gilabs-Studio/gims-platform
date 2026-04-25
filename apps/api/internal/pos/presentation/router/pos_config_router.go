package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/pos/presentation/handler"
	"github.com/gin-gonic/gin"
)

// RegisterPOSConfigRoutes registers POS configuration routes
func RegisterPOSConfigRoutes(rg *gin.RouterGroup, h *handler.POSConfigHandler) {
	configs := rg.Group("/config/outlet/:outletID")

	// Read access for cashiers
	configs.GET("", middleware.RequirePermission("pos.config.read"), h.GetByOutlet)
	// Write access for managers/owners only
	configs.PUT("", middleware.RequirePermission("pos.config.manage"), h.Upsert)
	// Receipt WhatsApp template is owner/admin only.
	configs.PUT("/receipt-whatsapp-template", middleware.RequirePermission("pos.receipt_template.manage"), h.UpdateReceiptWhatsAppTemplate)
}
