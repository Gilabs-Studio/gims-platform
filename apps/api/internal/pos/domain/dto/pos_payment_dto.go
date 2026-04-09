package dto

import "time"

// ProcessPaymentRequest initiates payment for a POS order
type ProcessPaymentRequest struct {
	Method          string  `json:"method" binding:"required,oneof=CASH CARD QRIS TRANSFER MIDTRANS"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	ReferenceNumber *string `json:"reference_number"`
	Notes           *string `json:"notes"`
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
	RedirectURL     *string    `json:"redirect_url"`
	ExpiresAt       *time.Time `json:"expires_at"`
	PaidAt          *time.Time `json:"paid_at"`
	Notes           *string    `json:"notes"`
	CreatedAt       time.Time  `json:"created_at"`
}

// MidtransCallbackPayload is the Midtrans server-to-server notification body
type MidtransCallbackPayload struct {
	MidtransOrderID   string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
}
