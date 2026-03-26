package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

type JournalLineRequest struct {
	ChartOfAccountID string  `json:"chart_of_account_id" binding:"required,uuid"`
	Debit            float64 `json:"debit" binding:"omitempty,gte=0"`
	Credit           float64 `json:"credit" binding:"omitempty,gte=0"`
	Memo             string  `json:"memo"`
}

type CreateJournalEntryRequest struct {
	EntryDate         string               `json:"entry_date" binding:"required"`
	Description       string               `json:"description"`
	ReferenceType     *string              `json:"reference_type"`
	ReferenceID       *string              `json:"reference_id"`
	Lines             []JournalLineRequest `json:"lines" binding:"required,min=2"`
	IsSystemGenerated bool                 `json:"is_system_generated"`
	SourceDocumentURL *string              `json:"source_document_url"`
}

type UpdateJournalEntryRequest struct {
	EntryDate     string               `json:"entry_date" binding:"required"`
	Description   string               `json:"description"`
	ReferenceType *string              `json:"reference_type"`
	ReferenceID   *string              `json:"reference_id"`
	Lines         []JournalLineRequest `json:"lines" binding:"required,min=2"`
}

// CreateAdjustmentJournalRequest is used for the dedicated adjustment journal endpoint.
// reference_type is always forced to "MANUAL_ADJUSTMENT" on the backend.
// description is required for audit trail.
type CreateAdjustmentJournalRequest struct {
	EntryDate         string               `json:"entry_date" binding:"required"`
	Description       string               `json:"description" binding:"required,min=3"`
	SourceDocumentURL *string              `json:"source_document_url"`
	Lines             []JournalLineRequest `json:"lines" binding:"required,min=2"`
}

type ListJournalEntriesRequest struct {
	Page          int                          `form:"page" binding:"omitempty,min=1"`
	PerPage       int                          `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search        string                       `form:"search"`
	Domain        *string                      `form:"domain" binding:"omitempty,oneof=sales purchase inventory stock cash_bank finance adjustment valuation"`
	Status        *financeModels.JournalStatus `form:"status" binding:"omitempty,oneof=draft posted reversed"`
	StartDate     *string                      `form:"start_date"`
	EndDate       *string                      `form:"end_date"`
	SortBy        string                       `form:"sort_by"`
	SortDir       string                       `form:"sort_dir"`
	ReferenceType *string                      `form:"reference_type"`
}

type JournalLineResponse struct {
	ID               string                  `json:"id"`
	ChartOfAccountID string                  `json:"chart_of_account_id"`
	ChartOfAccount   *ChartOfAccountResponse `json:"chart_of_account,omitempty"`
	Debit            float64                 `json:"debit"`
	Credit           float64                 `json:"credit"`
	Memo             string                  `json:"memo"`
}

type JournalEntryResponse struct {
	ID                string                      `json:"id"`
	EntryDate         time.Time                   `json:"entry_date"`
	Description       string                      `json:"description"`
	ReferenceType     *string                     `json:"reference_type"`
	ReferenceID       *string                     `json:"reference_id"`
	ReferenceCode     *string                     `json:"reference_code"`
	Status            financeModels.JournalStatus `json:"status"`
	PostedAt          *time.Time                  `json:"posted_at"`
	PostedBy          *string                     `json:"posted_by"`
	CreatedBy         *string                     `json:"created_by,omitempty"`
	IsSystemGenerated bool                        `json:"is_system_generated"`
	SourceDocumentURL *string                     `json:"source_document_url,omitempty"`
	Lines             []JournalLineResponse       `json:"lines"`
	DebitTotal        float64                     `json:"debit_total"`
	CreditTotal       float64                     `json:"credit_total"`
	IsValuation       bool                        `json:"is_valuation"`
	Source            string                      `json:"source"`
	ValuationRunID    *string                     `json:"valuation_run_id,omitempty"`
	CreatedAt         time.Time                   `json:"created_at"`
	UpdatedAt         time.Time                   `json:"updated_at"`
}

type TrialBalanceRow struct {
	ChartOfAccountID string                    `json:"chart_of_account_id"`
	Code             string                    `json:"code"`
	Name             string                    `json:"name"`
	Type             financeModels.AccountType `json:"type"`
	OpeningBalance   float64                   `json:"opening_balance"`
	DebitTotal       float64                   `json:"debit_total"`
	CreditTotal      float64                   `json:"credit_total"`
	Balance          float64                   `json:"balance"`
}

type TrialBalanceResponse struct {
	StartDate *time.Time        `json:"start_date"`
	EndDate   *time.Time        `json:"end_date"`
	Rows      []TrialBalanceRow `json:"rows"`
}

// ===== Journal Lines DTOs (sub-ledger list view) =====

// ListJournalLinesRequest for filtering journal lines with pagination
type ListJournalLinesRequest struct {
	Page              int     `form:"page" binding:"omitempty,min=1"`
	PerPage           int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search            string  `form:"search"`
	CashBankJournalID string  `form:"cash_bank_journal_id" binding:"omitempty,uuid"`
	ChartOfAccountID  string  `form:"chart_of_account_id" binding:"omitempty,uuid"`
	AccountType       string  `form:"account_type"`
	ReferenceType     *string `form:"reference_type"`
	JournalStatus     string  `form:"journal_status" binding:"omitempty,oneof=draft posted"`
	StartDate         *string `form:"start_date"`
	EndDate           *string `form:"end_date"`
	SortBy            string  `form:"sort_by"`
	SortDir           string  `form:"sort_dir"`
}

// JournalLineDetailResponse for individual journal line with entry context
type JournalLineDetailResponse struct {
	ID                 string  `json:"id"`
	JournalEntryID     string  `json:"journal_entry_id"`
	EntryDate          string  `json:"entry_date"`
	JournalDescription string  `json:"journal_description"`
	JournalStatus      string  `json:"journal_status"`
	ReferenceType      *string `json:"reference_type"`
	ReferenceID        *string `json:"reference_id"`
	ChartOfAccountID   string  `json:"chart_of_account_id"`
	ChartOfAccountCode string  `json:"chart_of_account_code"`
	ChartOfAccountName string  `json:"chart_of_account_name"`
	ChartOfAccountType string  `json:"chart_of_account_type"`
	Debit              float64 `json:"debit"`
	Credit             float64 `json:"credit"`
	Memo               string  `json:"memo"`
	RunningBalance     float64 `json:"running_balance"`
	CreatedAt          string  `json:"created_at"`
}

// ListJournalLinesResponse wraps lines with summary totals
type ListJournalLinesResponse struct {
	Lines       []JournalLineDetailResponse `json:"lines"`
	TotalDebit  float64                     `json:"total_debit"`
	TotalCredit float64                     `json:"total_credit"`
}

// ===== Form Data DTOs =====

// COAFormOption represents a Chart of Account option for dropdowns.
type COAFormOption struct {
	ID   string `json:"id"`
	Code string `json:"code"`
	Name string `json:"name"`
	Type string `json:"type"`
}

// BankAccountFormOption represents a Bank Account option for dropdowns.
type BankAccountFormOption struct {
	ID            string  `json:"id"`
	AccountName   string  `json:"account_name"`
	AccountNumber string  `json:"account_number"`
	BankName      string  `json:"bank_name"`
	Currency      string  `json:"currency"`
	COAId         *string `json:"coa_id,omitempty"`
}

// JournalEntryFormDataResponse for journal entry form options.
type JournalEntryFormDataResponse struct {
	ChartOfAccounts []COAFormOption `json:"chart_of_accounts"`
}

// ===== Valuation DTOs =====

// RunValuationRequest is the request payload for triggering a valuation run.
type RunValuationRequest struct {
	ValuationType string `json:"valuation_type" binding:"required,oneof=inventory currency depreciation cost"`
	PeriodStart   string `json:"period_start" binding:"required"` // YYYY-MM-DD
	PeriodEnd     string `json:"period_end" binding:"required"`   // YYYY-MM-DD
	ReferenceID   string `json:"reference_id"`                    // optional, for idempotency
}

// ValuationRunResponse is the API response for a valuation run record.
type ValuationRunResponse struct {
	ID             string  `json:"id"`
	ReferenceID    string  `json:"reference_id"`
	ValuationType  string  `json:"valuation_type"`
	PeriodStart    string  `json:"period_start"`
	PeriodEnd      string  `json:"period_end"`
	Status         string  `json:"status"`
	TotalDebit     float64 `json:"total_debit"`
	TotalCredit    float64 `json:"total_credit"`
	JournalEntryID *string `json:"journal_entry_id,omitempty"`
	ErrorMessage   *string `json:"error_message,omitempty"`
	CreatedBy      *string `json:"created_by,omitempty"`
	CompletedAt    *string `json:"completed_at,omitempty"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

// ValuationKPIMeta is additional metadata returned with valuation list endpoints.
type ValuationKPIMeta struct {
	TotalEntries   int64   `json:"total_entries"`
	TotalDebitSum  float64 `json:"total_debit_sum"`
	TotalCreditSum float64 `json:"total_credit_sum"`
	CompletedRuns  int64   `json:"completed_runs"`
	ProcessingRuns int64   `json:"processing_runs"`
	FailedRuns     int64   `json:"failed_runs"`
}

// ListValuationRunsRequest for filtering valuation runs.
type ListValuationRunsRequest struct {
	Page          int     `form:"page" binding:"omitempty,min=1"`
	PerPage       int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	ValuationType *string `form:"valuation_type" binding:"omitempty,oneof=inventory currency depreciation cost"`
	Status        *string `form:"status" binding:"omitempty,oneof=requested processing completed no_difference failed"`
	StartDate     *string `form:"start_date"`
	EndDate       *string `form:"end_date"`
	SortBy        string  `form:"sort_by"`
	SortDir       string  `form:"sort_dir"`
}
