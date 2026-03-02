package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

type CashBankJournalLineRequest struct {
	ChartOfAccountID string  `json:"chart_of_account_id" binding:"required,uuid"`
	ReferenceType    *string `json:"reference_type"`
	ReferenceID      *string `json:"reference_id" binding:"omitempty,uuid"`
	Amount           float64 `json:"amount" binding:"required,gt=0"`
	Memo             string  `json:"memo"`
}

type CreateCashBankJournalRequest struct {
	TransactionDate string                       `json:"transaction_date" binding:"required"`
	Type            financeModels.CashBankType   `json:"type" binding:"required,oneof=cash_in cash_out transfer"`
	Description     string                       `json:"description"`
	BankAccountID   string                       `json:"bank_account_id" binding:"required,uuid"`
	Lines           []CashBankJournalLineRequest `json:"lines" binding:"required,min=1,dive"`
}

type UpdateCashBankJournalRequest struct {
	TransactionDate string                       `json:"transaction_date" binding:"required"`
	Type            financeModels.CashBankType   `json:"type" binding:"required,oneof=cash_in cash_out transfer"`
	Description     string                       `json:"description"`
	BankAccountID   string                       `json:"bank_account_id" binding:"required,uuid"`
	Lines           []CashBankJournalLineRequest `json:"lines" binding:"required,min=1,dive"`
}

type ListCashBankJournalsRequest struct {
	Page     int                        `form:"page" binding:"omitempty,min=1"`
	PerPage  int                        `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search   string                     `form:"search"`
	Type     *financeModels.CashBankType `form:"type" binding:"omitempty,oneof=cash_in cash_out transfer"`
	Status   *financeModels.CashBankStatus `form:"status" binding:"omitempty,oneof=draft posted"`
	StartDate *string                   `form:"start_date"`
	EndDate   *string                   `form:"end_date"`
	SortBy   string                     `form:"sort_by"`
	SortDir  string                     `form:"sort_dir"`
}

type CashBankJournalLineResponse struct {
	ID               string                 `json:"id"`
	ChartOfAccountID string                 `json:"chart_of_account_id"`
	ChartOfAccount   *ChartOfAccountResponse `json:"chart_of_account,omitempty"`
	ReferenceType    *string                `json:"reference_type"`
	ReferenceID      *string                `json:"reference_id"`
	Amount           float64                `json:"amount"`
	Memo             string                 `json:"memo"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

type CashBankJournalResponse struct {
	ID              string                   `json:"id"`
	TransactionDate time.Time                `json:"transaction_date"`
	Type            financeModels.CashBankType `json:"type"`
	Description     string                   `json:"description"`
	BankAccountID   string                   `json:"bank_account_id"`
	BankAccount     *BankAccountMini         `json:"bank_account,omitempty"`
	TotalAmount     float64                  `json:"total_amount"`
	Status          financeModels.CashBankStatus `json:"status"`
	JournalEntryID  *string                  `json:"journal_entry_id"`
	PostedAt        *time.Time               `json:"posted_at"`
	PostedBy        *string                  `json:"posted_by"`
	CreatedAt       time.Time                `json:"created_at"`
	UpdatedAt       time.Time                `json:"updated_at"`
	Lines           []CashBankJournalLineResponse `json:"lines,omitempty"`
}
