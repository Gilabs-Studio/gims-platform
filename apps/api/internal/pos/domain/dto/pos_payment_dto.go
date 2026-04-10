package dto

import "time"

// ProcessPaymentRequest initiates payment for a POS order
type ProcessPaymentRequest struct {
	Method          string  `json:"method" binding:"required,oneof=CASH CARD QRIS TRANSFER DIGITAL"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	ReferenceNumber *string `json:"reference_number"`
	Notes           *string `json:"notes"`
	// CustomerName optionally captures the customer name on receipt (F&B use-case)
	CustomerName *string `json:"customer_name"`
}

// POSPaymentResponse returned to client for payment operations
type POSPaymentResponse struct {
	ID              string     `json:"id"`
	OrderID         string     `json:"order_id"`
	Method          string     `json:"method"`
	Status          string     `json:"status"`
	Amount          float64    `json:"amount"`
	TenderAmount    float64    `json:"tender_amount"`
	ChangeAmount    float64    `json:"change_amount"`
	ReferenceNumber *string    `json:"reference_number"`
	TransactionID   *string    `json:"transaction_id"`
	PaymentType     *string    `json:"payment_type"`
	VaNumber        *string    `json:"va_number"`
	QrCode          *string    `json:"qr_code"`
	PaymentURL      *string    `json:"payment_url"`
	ExpiresAt       *time.Time `json:"expires_at"`
	PaidAt          *time.Time `json:"paid_at"`
	Notes           *string    `json:"notes"`
	CreatedAt       time.Time  `json:"created_at"`
}

// XenditWebhookPayload is the Xendit server-to-server notification body for invoice events
type XenditWebhookPayload struct {
	// ExternalID matches the ExternalOrderID stored in POSPayment
	ExternalID string `json:"external_id"`
	// Status: PAID, EXPIRED, or other Xendit invoice statuses
	Status          string `json:"status"`
	ID              string `json:"id"` // Xendit invoice ID
	PaymentMethod   string `json:"payment_method"`
	PaymentChannel  string `json:"payment_channel"`
	PaidAmount      float64 `json:"paid_amount"`
	PaidAt          string  `json:"paid_at"`
}

