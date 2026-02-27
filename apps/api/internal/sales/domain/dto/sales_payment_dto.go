package dto

import "time"

type SalesPaymentInvoiceSummary struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	InvoiceNumber *string `json:"invoice_number,omitempty"`
	Type          string  `json:"type"`
	InvoiceDate   string  `json:"invoice_date"`
	DueDate       *string `json:"due_date,omitempty"`
	Amount        float64 `json:"amount"`
	Status        string  `json:"status"`
}

type SalesPaymentBankAccountSummary struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	AccountNumber string `json:"account_number"`
	AccountHolder string `json:"account_holder"`
	Currency      string `json:"currency"`
}

type SalesPaymentListResponse struct {
	ID          string                          `json:"id"`
	Invoice     *SalesPaymentInvoiceSummary     `json:"invoice,omitempty"`
	BankAccount *SalesPaymentBankAccountSummary `json:"bank_account,omitempty"`
	PaymentDate string                          `json:"payment_date"`
	Amount      float64                         `json:"amount"`
	Method      string                          `json:"method"`
	Status      string                          `json:"status"`
	CreatedAt   time.Time                       `json:"created_at"`
	UpdatedAt   time.Time                       `json:"updated_at"`
}

type SalesPaymentDetailResponse struct {
	SalesPaymentListResponse
	ReferenceNumber *string `json:"reference_number,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type SalesPaymentAddInvoiceItem struct {
	ID         string `json:"id"`
	SalesOrder *struct {
		ID   string `json:"id"`
		Code string `json:"code"`
	} `json:"sales_order,omitempty"`
	Code            string  `json:"code"`
	InvoiceNumber   *string `json:"invoice_number,omitempty"`
	Type            string  `json:"type"`
	InvoiceDate     string  `json:"invoice_date"`
	DueDate         *string `json:"due_date,omitempty"`
	Amount          float64 `json:"amount"`
	PaidAmount      float64 `json:"paid_amount"`
	RemainingAmount float64 `json:"remaining_amount"`
	Status          string  `json:"status"`
}

type SalesPaymentAddResponse struct {
	BankAccounts []*SalesPaymentBankAccountSummary `json:"bank_accounts"`
	Invoices     []*SalesPaymentAddInvoiceItem     `json:"invoices"`
}

type CreateSalesPaymentRequest struct {
	InvoiceID       string  `json:"invoice_id" binding:"required"`
	BankAccountID   string  `json:"bank_account_id" binding:"required"`
	PaymentDate     string  `json:"payment_date" binding:"required"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	Method          string  `json:"method" binding:"required"`
	ReferenceNumber *string `json:"reference_number,omitempty"`
	Notes           *string `json:"notes,omitempty"`
}

type SalesPaymentAuditTrailEntry struct {
	ID             string                 `json:"id"`
	ActorID        string                 `json:"actor_id"`
	ActorEmail     *string                `json:"actor_email,omitempty"`
	ActorName      *string                `json:"actor_name,omitempty"`
	PermissionCode string                 `json:"permission_code"`
	Action         string                 `json:"action"`
	Metadata       map[string]interface{} `json:"metadata"`
	CreatedAt      time.Time              `json:"created_at"`
}
