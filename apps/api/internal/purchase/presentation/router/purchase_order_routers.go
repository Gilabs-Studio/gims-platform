package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	purchaseOrderRead      = "purchase_order.read"
	purchaseOrderCreate    = "purchase_order.create"
	purchaseOrderUpdate    = "purchase_order.update"
	purchaseOrderDelete    = "purchase_order.delete"
	purchaseOrderConfirm   = "purchase_order.confirm"
	purchaseOrderRevise    = "purchase_order.revise"
	purchaseOrderExport    = "purchase_order.export"
	purchaseOrderAuditTrail = "purchase_order.audit_trail"
	purchaseOrderPrint      = "purchase_order.print"
)

func RegisterPurchaseOrderRoutes(r *gin.RouterGroup, h *handler.PurchaseOrderHandler, printH *handler.PurchaseOrderPrintHandler) {
	g := r.Group("/purchase-orders")
	g.GET("/add", middleware.RequirePermission(purchaseOrderCreate), h.Add)
	g.GET("", middleware.RequirePermission(purchaseOrderRead), h.List)
	g.GET("/export", middleware.RequirePermission(purchaseOrderExport), h.Export)
	g.POST("", middleware.RequirePermission(purchaseOrderCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(purchaseOrderRead), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission(purchaseOrderAuditTrail), h.AuditTrail)
	g.GET("/:id/print", middleware.RequirePermission(purchaseOrderPrint), printH.PrintPurchaseOrder)
	g.PUT("/:id", middleware.RequirePermission(purchaseOrderUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(purchaseOrderDelete), h.Delete)
	g.POST("/:id/confirm", middleware.RequirePermission(purchaseOrderConfirm), h.Confirm)
	g.POST("/:id/revise", middleware.RequirePermission(purchaseOrderRevise), h.Revise)
}
