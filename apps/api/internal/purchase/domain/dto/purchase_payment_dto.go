package dto

import "time"

type PurchasePaymentInvoiceSummary struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	InvoiceNumber string  `json:"invoice_number"`
	InvoiceDate   string  `json:"invoice_date"`
	DueDate       string  `json:"due_date"`
	TaxRate       float64 `json:"tax_rate"`
	TaxAmount     float64 `json:"tax_amount"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
	Notes         *string `json:"notes,omitempty"`
}

type PurchasePaymentBankAccountSummary struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	AccountNumber string `json:"account_number"`
	AccountHolder string `json:"account_holder"`
	Currency      string `json:"currency"`
}

type PurchasePaymentListResponse struct {
	ID          string                             `json:"id"`
	Invoice     *PurchasePaymentInvoiceSummary     `json:"invoice,omitempty"`
	BankAccount *PurchasePaymentBankAccountSummary `json:"bank_account,omitempty"`
	PaymentDate string                             `json:"payment_date"`
	Amount      float64                            `json:"amount"`
	Method      string                             `json:"method"`
	Status      string                             `json:"status"`
	CreatedAt   time.Time                          `json:"created_at"`
	UpdatedAt   time.Time                          `json:"updated_at"`
}

type PurchasePaymentDetailResponse struct {
	PurchasePaymentListResponse
	ReferenceNumber *string `json:"reference_number,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type PurchasePaymentAddInvoiceItem struct {
	ID            string `json:"id"`
	PurchaseOrder *struct {
		ID   string `json:"id"`
		Code string `json:"code"`
	} `json:"purchase_order,omitempty"`
	Code            string  `json:"code"`
	InvoiceNumber   string  `json:"invoice_number"`
	Type            string  `json:"type"`
	InvoiceDate     string  `json:"invoice_date"`
	DueDate         string  `json:"due_date"`
	Amount          float64 `json:"amount"`
	PaidAmount      float64 `json:"paid_amount"`
	RemainingAmount float64 `json:"remaining_amount"`
	Status          string  `json:"status"`
}

type PurchasePaymentAddResponse struct {
	BankAccounts []*PurchasePaymentBankAccountSummary `json:"bank_accounts"`
	Invoices     []*PurchasePaymentAddInvoiceItem     `json:"invoices"`
}

type CreatePurchasePaymentRequest struct {
	InvoiceID       string  `json:"invoice_id" binding:"required"`
	BankAccountID   string  `json:"bank_account_id" binding:"required"`
	PaymentDate     string  `json:"payment_date" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	Method          string  `json:"method" binding:"required"`
	ReferenceNumber *string `json:"reference_number,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type PurchasePaymentAuditTrailEntry struct {
	ID             string                 `json:"id"`
	PermissionCode string                 `json:"permission_code"`
	Action         string                 `json:"action"`
	TargetID       string                 `json:"target_id"`
	Metadata       map[string]interface{} `json:"metadata"`
	User           *AuditTrailUser        `json:"user,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
}
