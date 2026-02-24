package dto

type BankAccountResponse struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	AccountNumber    string  `json:"account_number"`
	AccountHolder    string  `json:"account_holder"`
	Currency         string  `json:"currency"`
	ChartOfAccountID *string `json:"chart_of_account_id"`
	VillageID        *string `json:"village_id"`
	BankAddress      string  `json:"bank_address"`
	BankPhone        string  `json:"bank_phone"`
	IsActive         bool    `json:"is_active"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        string  `json:"updated_at"`
}

type CreateBankAccountRequest struct {
	Name             string  `json:"name" binding:"required"`
	AccountNumber    string  `json:"account_number" binding:"required"`
	AccountHolder    string  `json:"account_holder" binding:"required"`
	Currency         string  `json:"currency" binding:"required"`
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
	Currency         string  `json:"currency" binding:"required"`
	ChartOfAccountID *string `json:"chart_of_account_id"`
	VillageID        *string `json:"village_id" binding:"omitempty,uuid"`
	BankAddress      string  `json:"bank_address"`
	BankPhone        string  `json:"bank_phone"`
	IsActive         *bool   `json:"is_active"`
}
