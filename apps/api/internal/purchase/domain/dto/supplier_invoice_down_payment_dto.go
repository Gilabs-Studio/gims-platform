package dto

import "time"

type SupplierInvoiceDownPaymentRegularInvoiceMini struct {
	ID   string `json:"id"`
	Code string `json:"code"`
}

type SupplierInvoiceDownPaymentListResponse struct {
	ID string `json:"id"`

	PurchaseOrder *SupplierInvoicePurchaseOrderMini `json:"purchase_order,omitempty"`

	Code          string  `json:"code"`
	InvoiceNumber string  `json:"invoice_number"`
	InvoiceDate   string  `json:"invoice_date"`
	DueDate       string  `json:"due_date"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	Notes         *string `json:"notes"`

	RegularInvoices []SupplierInvoiceDownPaymentRegularInvoiceMini `json:"regular_invoices,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SupplierInvoiceDownPaymentDetailResponse struct {
	ID string `json:"id"`

	PurchaseOrder *SupplierInvoicePurchaseOrderMini `json:"purchase_order,omitempty"`

	Code          string  `json:"code"`
	InvoiceNumber string  `json:"invoice_number"`
	InvoiceDate   string  `json:"invoice_date"`
	DueDate       string  `json:"due_date"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	Notes         *string `json:"notes"`

	RegularInvoices []SupplierInvoiceDownPaymentRegularInvoiceMini `json:"regular_invoices,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateSupplierInvoiceDownPaymentRequest struct {
	PurchaseOrderID string  `json:"purchase_order_id" binding:"required,uuid"`
	InvoiceDate     string  `json:"invoice_date" binding:"required"`
	DueDate         string  `json:"due_date" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	Notes           *string `json:"notes"`
}

type UpdateSupplierInvoiceDownPaymentRequest struct {
	PurchaseOrderID string  `json:"purchase_order_id" binding:"required,uuid"`
	InvoiceDate     string  `json:"invoice_date" binding:"required"`
	DueDate         string  `json:"due_date" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	Notes           *string `json:"notes"`
}

type SupplierInvoiceDownPaymentAddResponse struct {
	PurchaseOrders []SupplierInvoiceAddPurchaseOrder `json:"purchase_orders"`
}
