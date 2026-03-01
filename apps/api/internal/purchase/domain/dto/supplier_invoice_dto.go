package dto

import (
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	purchaseModels "github.com/gilabs/gims/api/internal/purchase/data/models"
)

type SupplierInvoiceAuditTrailEntry = PurchaseRequisitionAuditTrailEntry

type SupplierInvoicePurchaseOrderMini struct {
	ID   string `json:"id"`
	Code string `json:"code"`
}

type SupplierInvoicePaymentTermsMini struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Days *int   `json:"days,omitempty"`
}

type SupplierInvoiceListResponse struct {
	ID string `json:"id"`

	PurchaseOrder *SupplierInvoicePurchaseOrderMini `json:"purchase_order,omitempty"`
	PaymentTerms  *SupplierInvoicePaymentTermsMini  `json:"payment_terms,omitempty"`

	Type          string `json:"type"`
	Code          string `json:"code"`
	InvoiceNumber string `json:"invoice_number"`
	InvoiceDate   string `json:"invoice_date"`
	DueDate       string `json:"due_date"`

	SupplierName string `json:"supplier_name"`

	TaxRate           float64 `json:"tax_rate"`
	TaxAmount         float64 `json:"tax_amount"`
	DeliveryCost      float64 `json:"delivery_cost"`
	OtherCost         float64 `json:"other_cost"`
	SubTotal          float64 `json:"sub_total"`
	Amount            float64 `json:"amount"`
	PaidAmount        float64 `json:"paid_amount"`
	RemainingAmount   float64 `json:"remaining_amount"`
	DownPaymentAmount float64 `json:"down_payment_amount"`

	DownPaymentInvoice *SupplierInvoiceAddDownPaymentMini `json:"down_payment_invoice,omitempty"`

	Status string  `json:"status"`
	Notes  *string `json:"notes"`

	CreatedBy   string     `json:"created_by"`
	SubmittedAt *time.Time `json:"submitted_at"`
	ApprovedAt  *time.Time `json:"approved_at"`
	RejectedAt  *time.Time `json:"rejected_at"`
	CancelledAt *time.Time `json:"cancelled_at"`
}

type SupplierInvoiceItemResponse struct {
	ID                  string      `json:"id"`
	SupplierInvoiceID   string      `json:"supplier_invoice_id"`
	ProductID           string      `json:"product_id"`
	Product             interface{} `json:"product,omitempty"`
	Quantity            float64     `json:"quantity"`
	Price               float64     `json:"price"`
	Discount            float64     `json:"discount"`
	SubTotal            float64     `json:"sub_total"`
	PurchaseOrderItemID *string     `json:"purchase_order_item_id,omitempty"`
	CreatedAt           time.Time   `json:"created_at"`
	UpdatedAt           time.Time   `json:"updated_at"`
}

type SupplierInvoiceDetailResponse struct {
	ID string `json:"id"`

	PurchaseOrder *SupplierInvoicePurchaseOrderMini `json:"purchase_order,omitempty"`
	PaymentTerms  *SupplierInvoicePaymentTermsMini  `json:"payment_terms,omitempty"`

	Type          string `json:"type"`
	Code          string `json:"code"`
	InvoiceNumber string `json:"invoice_number"`
	InvoiceDate   string `json:"invoice_date"`
	DueDate       string `json:"due_date"`

	SupplierName string `json:"supplier_name"`

	TaxRate           float64 `json:"tax_rate"`
	TaxAmount         float64 `json:"tax_amount"`
	DeliveryCost      float64 `json:"delivery_cost"`
	OtherCost         float64 `json:"other_cost"`
	SubTotal          float64 `json:"sub_total"`
	Amount            float64 `json:"amount"`
	PaidAmount        float64 `json:"paid_amount"`
	RemainingAmount   float64 `json:"remaining_amount"`
	DownPaymentAmount float64 `json:"down_payment_amount"`

	DownPaymentInvoice *SupplierInvoiceAddDownPaymentMini `json:"down_payment_invoice,omitempty"`

	Status string  `json:"status"`
	Notes  *string `json:"notes"`

	Items []SupplierInvoiceItemResponse `json:"items"`

	CreatedBy   string     `json:"created_by"`
	SubmittedAt *time.Time `json:"submitted_at"`
	ApprovedAt  *time.Time `json:"approved_at"`
	RejectedAt  *time.Time `json:"rejected_at"`
	CancelledAt *time.Time `json:"cancelled_at"`
}

type CreateSupplierInvoiceItemRequest struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Quantity  float64 `json:"quantity" binding:"required,gt=0"`
	Price     float64 `json:"price" binding:"required,gt=0"`
	Discount  float64 `json:"discount" binding:"omitempty,gte=0,lte=100"`
}

type CreateSupplierInvoiceRequest struct {
	PurchaseOrderID string                             `json:"purchase_order_id" binding:"required,uuid"`
	PaymentTermsID  string                             `json:"payment_terms_id" binding:"required,uuid"`
	InvoiceNumber   string                             `json:"invoice_number" binding:"required"`
	InvoiceDate     string                             `json:"invoice_date" binding:"required"`
	DueDate         string                             `json:"due_date" binding:"required"`
	TaxRate         float64                            `json:"tax_rate" binding:"omitempty,gte=0,lte=100"`
	DeliveryCost    float64                            `json:"delivery_cost" binding:"omitempty,gte=0"`
	OtherCost       float64                            `json:"other_cost" binding:"omitempty,gte=0"`
	Notes           *string                            `json:"notes"`
	Items           []CreateSupplierInvoiceItemRequest `json:"items" binding:"required,min=1,dive"`
}

type UpdateSupplierInvoiceRequest struct {
	PurchaseOrderID string                             `json:"purchase_order_id" binding:"required,uuid"`
	PaymentTermsID  string                             `json:"payment_terms_id" binding:"required,uuid"`
	InvoiceNumber   string                             `json:"invoice_number" binding:"required"`
	InvoiceDate     string                             `json:"invoice_date" binding:"required"`
	DueDate         string                             `json:"due_date" binding:"required"`
	TaxRate         float64                            `json:"tax_rate" binding:"omitempty,gte=0,lte=100"`
	DeliveryCost    float64                            `json:"delivery_cost" binding:"omitempty,gte=0"`
	OtherCost       float64                            `json:"other_cost" binding:"omitempty,gte=0"`
	Notes           *string                            `json:"notes"`
	Items           []CreateSupplierInvoiceItemRequest `json:"items" binding:"required,min=1,dive"`
}

// Add data DTOs

type SupplierInvoiceAddPaymentTerms struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SupplierInvoiceAddProductMini struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Code     string  `json:"code"`
	ImageURL *string `json:"image_url"`
}

type SupplierInvoiceAddPurchaseOrderItem struct {
	ID       string                         `json:"id"`
	Product  *SupplierInvoiceAddProductMini `json:"product,omitempty"`
	Quantity float64                        `json:"quantity"`
	Price    float64                        `json:"price"`
	Subtotal float64                        `json:"subtotal"`
}

type SupplierInvoiceAddSupplierMini struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SupplierInvoiceAddDownPaymentMini struct {
	ID            string                            `json:"id"`
	PurchaseOrder *SupplierInvoicePurchaseOrderMini `json:"purchase_order,omitempty"`
	Code          string                            `json:"code"`
	InvoiceNumber string                            `json:"invoice_number"`
	InvoiceDate   string                            `json:"invoice_date"`
	DueDate       string                            `json:"due_date"`
	Amount        float64                           `json:"amount"`
	Status        string                            `json:"status"`
	Notes         *string                           `json:"notes"`
	CreatedAt     time.Time                         `json:"created_at"`
	UpdatedAt     time.Time                         `json:"updated_at"`
}

type SupplierInvoiceAddPurchaseOrder struct {
	ID          string                                `json:"id"`
	Supplier    *SupplierInvoiceAddSupplierMini       `json:"supplier,omitempty"`
	Code        string                                `json:"code"`
	OrderDate   string                                `json:"order_date"`
	Status      string                                `json:"status"`
	TotalAmount float64                               `json:"total_amount"`
	Items       []SupplierInvoiceAddPurchaseOrderItem `json:"items"`
	InvoiceDP   *SupplierInvoiceAddDownPaymentMini    `json:"invoice_dp,omitempty"`
}

type SupplierInvoiceAddResponse struct {
	PaymentTerms   []SupplierInvoiceAddPaymentTerms  `json:"payment_terms"`
	PurchaseOrders []SupplierInvoiceAddPurchaseOrder `json:"purchase_orders"`
}

// Keep core model imports referenced to avoid unused when generated conditionally.
var _ = coreModels.PaymentTerms{}
var _ = purchaseModels.PurchaseOrder{}
