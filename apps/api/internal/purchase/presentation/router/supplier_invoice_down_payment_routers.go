package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	supplierInvoiceDPRead    = "supplier_invoice_dp.read"
	supplierInvoiceDPCreate  = "supplier_invoice_dp.create"
	supplierInvoiceDPUpdate  = "supplier_invoice_dp.update"
	supplierInvoiceDPDelete  = "supplier_invoice_dp.delete"
	supplierInvoiceDPPending = "supplier_invoice_dp.pending"
	supplierInvoiceDPExport  = "supplier_invoice_dp.export"
	supplierInvoiceDPAuditTrail = "supplier_invoice_dp.audit_trail"
)

func RegisterSupplierInvoiceDownPaymentRoutes(r *gin.RouterGroup, h *handler.SupplierInvoiceDownPaymentHandler) {
	g := r.Group("/supplier-invoice-down-payments")
	g.GET("/add", middleware.RequirePermission(supplierInvoiceDPCreate), h.Add)
	g.GET("", middleware.RequirePermission(supplierInvoiceDPRead), h.List)
	g.GET("/export", middleware.RequirePermission(supplierInvoiceDPExport), h.Export)
	g.POST("", middleware.RequirePermission(supplierInvoiceDPCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(supplierInvoiceDPRead), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission(supplierInvoiceDPAuditTrail), h.AuditTrail)
	g.PUT("/:id", middleware.RequirePermission(supplierInvoiceDPUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(supplierInvoiceDPDelete), h.Delete)
	g.POST("/:id/pending", middleware.RequirePermission(supplierInvoiceDPPending), h.Pending)
}
