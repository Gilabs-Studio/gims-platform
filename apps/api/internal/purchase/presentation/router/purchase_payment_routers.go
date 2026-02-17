package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	purchasePaymentRead       = "purchase_payment.read"
	purchasePaymentCreate     = "purchase_payment.create"
	purchasePaymentDelete     = "purchase_payment.delete"
	purchasePaymentConfirm    = "purchase_payment.confirm"
	purchasePaymentExport     = "purchase_payment.export"
	purchasePaymentAuditTrail = "purchase_payment.audit_trail"
)

func RegisterPurchasePaymentRoutes(r *gin.RouterGroup, h *handler.PurchasePaymentHandler) {
	g := r.Group("/payments")
	g.GET("/add", middleware.RequirePermission(purchasePaymentCreate), h.Add)
	g.GET("", middleware.RequirePermission(purchasePaymentRead), h.List)
	g.GET("/export", middleware.RequirePermission(purchasePaymentExport), h.Export)
	g.POST("", middleware.RequirePermission(purchasePaymentCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(purchasePaymentRead), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission(purchasePaymentAuditTrail), h.AuditTrail)
	g.DELETE("/:id", middleware.RequirePermission(purchasePaymentDelete), h.Delete)
	g.POST("/:id/confirm", middleware.RequirePermission(purchasePaymentConfirm), h.Confirm)
}
