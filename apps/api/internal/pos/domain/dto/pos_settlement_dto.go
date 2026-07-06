package dto

import "time"

type POSSettlementOverviewResponse struct {
	Configured              bool    `json:"configured"`
	PayoutEnabled           bool    `json:"payout_enabled"`
	Currency                string  `json:"currency"`
	CollectedAmount         float64 `json:"collected_amount"`
	ReservedPayoutAmount    float64 `json:"reserved_payout_amount"`
	AvailablePayoutAmount   float64 `json:"available_payout_amount"`
	PlatformLiquidityStatus string  `json:"platform_liquidity_status"`
	Message                 string  `json:"message,omitempty"`
	PayoutFee               float64 `json:"payout_fee"`
	PayoutVatPercent        float64 `json:"payout_vat_percent"`
}

type POSSettlementPayoutChannelResponse struct {
	ChannelName     string                         `json:"channel_name"`
	ChannelCategory string                         `json:"channel_category"`
	ChannelCode     string                         `json:"channel_code"`
	Currency        string                         `json:"currency"`
	AmountLimits    POSSettlementPayoutAmountLimit `json:"amount_limits"`
}

type POSSettlementPayoutAmountLimit struct {
	Minimum          float64 `json:"minimum"`
	Maximum          float64 `json:"maximum"`
	MinimumIncrement float64 `json:"minimum_increment"`
}

type ValidatePOSBankAccountRequest struct {
	BankCode      string `json:"bank_code" binding:"required"`
	AccountNumber string `json:"account_number" binding:"required"`
}

type ValidatePOSBankAccountResponse struct {
	BankCode          string `json:"bank_code"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
	Status            string `json:"status"`
}

type RequestPayoutOTPRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}

type CreatePOSSettlementPayoutRequest struct {
	Amount            int64   `json:"amount" binding:"required,gt=0"`
	ChannelCode       string  `json:"channel_code" binding:"required,min=3,max=50"`
	AccountNumber     string  `json:"account_number" binding:"required,min=4,max=100"`
	AccountHolderName string  `json:"account_holder_name" binding:"required,min=1,max=100"`
	Description       *string `json:"description" binding:"omitempty,max=100"`
	IdempotencyKey    string  `json:"idempotency_key" binding:"required,min=8,max=100"`
	OTPCode           string  `json:"otp_code" binding:"required,len=6"`
}

type POSSettlementPayoutResponse struct {
	ID                   string     `json:"id"`
	ReferenceID          string     `json:"reference_id"`
	XenditPayoutID       *string    `json:"xendit_payout_id,omitempty"`
	Status               string     `json:"status"`
	Amount               float64    `json:"amount"`
	Fee                  float64    `json:"fee"`
	Vat                  float64    `json:"vat"`
	Currency             string     `json:"currency"`
	ChannelCode          string     `json:"channel_code"`
	AccountNumberMasked  string     `json:"account_number_masked"`
	AccountHolderName    string     `json:"account_holder_name"`
	Description          *string    `json:"description,omitempty"`
	EstimatedArrivalTime *time.Time `json:"estimated_arrival_time,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}
