package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	goodsReceiptRead       = "goods_receipt.read"
	goodsReceiptCreate     = "goods_receipt.create"
	goodsReceiptUpdate     = "goods_receipt.update"
	goodsReceiptDelete     = "goods_receipt.delete"
	goodsReceiptConfirm    = "goods_receipt.confirm"
	goodsReceiptExport     = "goods_receipt.export"
	goodsReceiptAuditTrail = "goods_receipt.audit_trail"
)

func RegisterGoodsReceiptRoutes(r *gin.RouterGroup, h *handler.GoodsReceiptHandler) {
	g := r.Group("/goods-receipt")
	g.GET("/add", middleware.RequirePermission(goodsReceiptCreate), h.Add)
	g.GET("", middleware.RequirePermission(goodsReceiptRead), h.List)
	g.GET("/export", middleware.RequirePermission(goodsReceiptExport), h.Export)
	g.POST("", middleware.RequirePermission(goodsReceiptCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(goodsReceiptRead), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission(goodsReceiptAuditTrail), h.AuditTrail)
	g.PUT("/:id", middleware.RequirePermission(goodsReceiptUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(goodsReceiptDelete), h.Delete)
	g.POST("/:id/confirm", middleware.RequirePermission(goodsReceiptConfirm), h.Confirm)
}
