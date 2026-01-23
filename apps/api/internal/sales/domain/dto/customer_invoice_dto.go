package dto

// CreateCustomerInvoiceRequest represents the request to create a customer invoice
type CreateCustomerInvoiceRequest struct {
	InvoiceDate    string   `json:"invoice_date" binding:"required"`
	DueDate        *string  `json:"due_date"`
	Type           string   `json:"type" binding:"omitempty,oneof=regular proforma"`
	SalesOrderID   *string  `json:"sales_order_id" binding:"omitempty,uuid"`
	PaymentTermsID *string  `json:"payment_terms_id" binding:"omitempty,uuid"`
	TaxRate        float64  `json:"tax_rate" binding:"gte=0,lte=100"`
	DeliveryCost   float64  `json:"delivery_cost" binding:"gte=0"`
	OtherCost      float64  `json:"other_cost" binding:"gte=0"`
	Notes          string   `json:"notes"`
	Items          []CreateCustomerInvoiceItemRequest `json:"items" binding:"required,min=1,dive"`
}

// CreateCustomerInvoiceItemRequest represents an item in the invoice
type CreateCustomerInvoiceItemRequest struct {
	ProductID string  `json:"product_id" binding:"required,uuid"`
	Quantity  float64 `json:"quantity" binding:"required,gt=0"`
	Price     float64 `json:"price" binding:"required,gt=0"`
	Discount  float64 `json:"discount" binding:"gte=0"`
	HPPAmount float64 `json:"hpp_amount" binding:"gte=0"`
}

// UpdateCustomerInvoiceRequest represents the request to update a customer invoice
type UpdateCustomerInvoiceRequest struct {
	InvoiceDate    *string  `json:"invoice_date"`
	DueDate        *string  `json:"due_date"`
	Type           *string  `json:"type" binding:"omitempty,oneof=regular proforma"`
	PaymentTermsID *string  `json:"payment_terms_id"`
	TaxRate        *float64 `json:"tax_rate" binding:"omitempty,gte=0,lte=100"`
	DeliveryCost   *float64 `json:"delivery_cost" binding:"omitempty,gte=0"`
	OtherCost      *float64 `json:"other_cost" binding:"omitempty,gte=0"`
	Notes          *string  `json:"notes"`
	Items          *[]CreateCustomerInvoiceItemRequest `json:"items" binding:"omitempty,dive"`
}

// ListCustomerInvoicesRequest represents the request to list customer invoices
type ListCustomerInvoicesRequest struct {
	Page           int    `form:"page" binding:"omitempty,min=1"`
	PerPage        int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search         string `form:"search"`
	Status         string `form:"status" binding:"omitempty,oneof=unpaid partial paid cancelled"`
	Type           string `form:"type" binding:"omitempty,oneof=regular proforma"`
	DateFrom       string `form:"date_from"`
	DateTo         string `form:"date_to"`
	DueDateFrom    string `form:"due_date_from"`
	DueDateTo      string `form:"due_date_to"`
	SalesOrderID   string `form:"sales_order_id"`
	SortBy         string `form:"sort_by"`
	SortDir        string `form:"sort_dir" binding:"omitempty,oneof=asc desc"`
}

// ListCustomerInvoiceItemsRequest represents the request to list invoice items with pagination
type ListCustomerInvoiceItemsRequest struct {
	Page    int `form:"page" binding:"omitempty,min=1"`
	PerPage int `form:"per_page" binding:"omitempty,min=1,max=100"`
}

// UpdateCustomerInvoiceStatusRequest represents the request to update invoice status
type UpdateCustomerInvoiceStatusRequest struct {
	Status     string   `json:"status" binding:"required,oneof=partial paid cancelled"`
	PaidAmount *float64 `json:"paid_amount" binding:"omitempty,gte=0"`
	PaymentAt  *string  `json:"payment_at"`
}

// RecordPaymentRequest represents the request to record a payment
type RecordPaymentRequest struct {
	PaidAmount float64 `json:"paid_amount" binding:"required,gt=0"`
	PaymentAt  *string `json:"payment_at"`
	Notes      string  `json:"notes"`
}

// CustomerInvoiceResponse represents the response for a customer invoice
type CustomerInvoiceResponse struct {
	ID              string                        `json:"id"`
	Code            string                        `json:"code"`
	InvoiceNumber   *string                       `json:"invoice_number"`
	Type            string                        `json:"type"`
	InvoiceDate     string                        `json:"invoice_date"`
	DueDate         *string                       `json:"due_date"`
	SalesOrderID    *string                       `json:"sales_order_id"`
	SalesOrder      *SalesOrderBriefResponse      `json:"sales_order,omitempty"`
	PaymentTermsID  *string                       `json:"payment_terms_id"`
	PaymentTerms    *PaymentTermsResponse         `json:"payment_terms,omitempty"`
	Subtotal        float64                       `json:"subtotal"`
	TaxRate         float64                       `json:"tax_rate"`
	TaxAmount       float64                       `json:"tax_amount"`
	DeliveryCost    float64                       `json:"delivery_cost"`
	OtherCost       float64                       `json:"other_cost"`
	Amount          float64                       `json:"amount"`
	PaidAmount      float64                       `json:"paid_amount"`
	RemainingAmount float64                       `json:"remaining_amount"`
	Status          string                        `json:"status"`
	Notes           string                        `json:"notes"`
	PaymentAt       *string                       `json:"payment_at"`
	CreatedBy       *string                       `json:"created_by"`
	CancelledBy     *string                       `json:"cancelled_by"`
	CancelledAt     *string                       `json:"cancelled_at"`
	Items           []CustomerInvoiceItemResponse `json:"items,omitempty"`
	CreatedAt       string                        `json:"created_at"`
	UpdatedAt       string                        `json:"updated_at"`
}

// CustomerInvoiceItemResponse represents an item in the invoice response
type CustomerInvoiceItemResponse struct {
	ID                string            `json:"id"`
	CustomerInvoiceID string            `json:"customer_invoice_id"`
	ProductID         string            `json:"product_id"`
	Product           *ProductResponse  `json:"product,omitempty"`
	Quantity          float64           `json:"quantity"`
	Price             float64           `json:"price"`
	Discount          float64           `json:"discount"`
	Subtotal          float64           `json:"subtotal"`
	HPPAmount         float64           `json:"hpp_amount"`
	CreatedAt         string            `json:"created_at"`
	UpdatedAt         string            `json:"updated_at"`
}

// SalesOrderBriefResponse represents a brief sales order info in response
type SalesOrderBriefResponse struct {
	ID   string `json:"id"`
	Code string `json:"code"`
}
