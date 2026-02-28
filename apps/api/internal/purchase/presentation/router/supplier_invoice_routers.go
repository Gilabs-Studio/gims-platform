package router

import (
	"github.com/gilabs/gims/api/internal/core/middleware"
	"github.com/gilabs/gims/api/internal/purchase/presentation/handler"
	"github.com/gin-gonic/gin"
)

const (
	supplierInvoiceRead       = "supplier_invoice.read"
	supplierInvoiceCreate     = "supplier_invoice.create"
	supplierInvoiceUpdate     = "supplier_invoice.update"
	supplierInvoiceDelete     = "supplier_invoice.delete"
	supplierInvoicePending    = "supplier_invoice.pending"
	supplierInvoiceExport     = "supplier_invoice.export"
	supplierInvoiceAuditTrail = "supplier_invoice.audit_trail"
	supplierInvoicePrint      = "supplier_invoice.print"
)

func RegisterSupplierInvoiceRoutes(r *gin.RouterGroup, h *handler.SupplierInvoiceHandler, printH *handler.SupplierInvoicePrintHandler) {
	g := r.Group("/supplier-invoices")
	g.GET("/add", middleware.RequirePermission(supplierInvoiceCreate), h.Add)
	g.GET("", middleware.RequirePermission(supplierInvoiceRead), h.List)
	g.GET("/export", middleware.RequirePermission(supplierInvoiceExport), h.Export)
	g.POST("", middleware.RequirePermission(supplierInvoiceCreate), h.Create)
	g.GET("/:id", middleware.RequirePermission(supplierInvoiceRead), h.GetByID)
	g.GET("/:id/audit-trail", middleware.RequirePermission(supplierInvoiceAuditTrail), h.AuditTrail)
	g.GET("/:id/print", middleware.RequirePermission(supplierInvoicePrint), printH.PrintSupplierInvoice)
	g.PUT("/:id", middleware.RequirePermission(supplierInvoiceUpdate), h.Update)
	g.DELETE("/:id", middleware.RequirePermission(supplierInvoiceDelete), h.Delete)
	g.POST("/:id/pending", middleware.RequirePermission(supplierInvoicePending), h.Pending)
}
