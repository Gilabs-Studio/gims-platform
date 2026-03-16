package dto

type BankAccountResponse struct {
	ID                 string                           `json:"id"`
	Name               string                           `json:"name"`
	AccountNumber      string                           `json:"account_number"`
	AccountHolder      string                           `json:"account_holder"`
	CurrencyID         *string                          `json:"currency_id"`
	CurrencyDetail     *CurrencyResponse                `json:"currency_detail,omitempty"`
	Currency           string                           `json:"currency"`
	ChartOfAccountID   *string                          `json:"chart_of_account_id"`
	VillageID          *string                          `json:"village_id"`
	BankAddress        string                           `json:"bank_address"`
	BankPhone          string                           `json:"bank_phone"`
	IsActive           bool                             `json:"is_active"`
	CreatedAt          string                           `json:"created_at"`
	UpdatedAt          string                           `json:"updated_at"`
	TransactionHistory []BankAccountTransactionResponse `json:"transaction_history,omitempty"`
}

type BankAccountTransactionResponse struct {
	ID                 string  `json:"id"`
	TransactionType    string  `json:"transaction_type"`
	TransactionDate    string  `json:"transaction_date"`
	ReferenceType      string  `json:"reference_type"`
	ReferenceID        string  `json:"reference_id"`
	ReferenceNumber    *string `json:"reference_number,omitempty"`
	RelatedEntityType  *string `json:"related_entity_type,omitempty"`
	RelatedEntityID    *string `json:"related_entity_id,omitempty"`
	RelatedEntityLabel *string `json:"related_entity_label,omitempty"`
	Amount             float64 `json:"amount"`
	Status             string  `json:"status"`
	Description        string  `json:"description"`
}

type UnifiedBankAccountResponse struct {
	ID             string            `json:"id"`
	SourceType     string            `json:"source_type"`
	Name           string            `json:"name"`
	BankName       *string           `json:"bank_name,omitempty"`
	BankCode       *string           `json:"bank_code,omitempty"`
	AccountNumber  string            `json:"account_number"`
	AccountHolder  string            `json:"account_holder"`
	CurrencyID     *string           `json:"currency_id"`
	Currency       string            `json:"currency"`
	CurrencyDetail *CurrencyResponse `json:"currency_detail,omitempty"`
	OwnerType      string            `json:"owner_type"`
	OwnerID        *string           `json:"owner_id,omitempty"`
	OwnerName      string            `json:"owner_name"`
	OwnerCode      *string           `json:"owner_code,omitempty"`
	IsActive       bool              `json:"is_active"`
	CreatedAt      string            `json:"created_at"`
	UpdatedAt      string            `json:"updated_at"`
}

type CreateBankAccountRequest struct {
	Name             string  `json:"name" binding:"required"`
	AccountNumber    string  `json:"account_number" binding:"required"`
	AccountHolder    string  `json:"account_holder" binding:"required"`
	CurrencyID       *string `json:"currency_id" binding:"required,uuid"`
	Currency         string  `json:"currency"`
	ChartOfAccountID *string `json:"chart_of_account_id"`
	VillageID        *string `json:"village_id" binding:"omitempty,uuid"`
	BankAddress      string  `json:"bank_address"`
	BankPhone        string  `json:"bank_phone"`
	IsActive         *bool   `json:"is_active"`
}

type UpdateBankAccountRequest struct {
	Name             string  `json:"name" binding:"required"`
	AccountNumber    string  `json:"account_number" binding:"required"`
	AccountHolder    string  `json:"account_holder" binding:"required"`
	CurrencyID       *string `json:"currency_id" binding:"required,uuid"`
	Currency         string  `json:"currency"`
	ChartOfAccountID *string `json:"chart_of_account_id"`
	VillageID        *string `json:"village_id" binding:"omitempty,uuid"`
	BankAddress      string  `json:"bank_address"`
	BankPhone        string  `json:"bank_phone"`
	IsActive         *bool   `json:"is_active"`
}
