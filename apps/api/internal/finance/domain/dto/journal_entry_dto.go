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
	ReferenceID       *string              `json:"reference_id" binding:"omitempty,uuid"`
	Lines             []JournalLineRequest `json:"lines" binding:"required,min=2"`
	IsSystemGenerated bool                 `json:"is_system_generated"`
	SourceDocumentURL *string              `json:"source_document_url"`
}

type UpdateJournalEntryRequest struct {
	EntryDate     string               `json:"entry_date" binding:"required"`
	Description   string               `json:"description"`
	ReferenceType *string              `json:"reference_type"`
	ReferenceID   *string              `json:"reference_id" binding:"omitempty,uuid"`
	Lines         []JournalLineRequest `json:"lines" binding:"required,min=2"`
}

type ListJournalEntriesRequest struct {
	Page          int                          `form:"page" binding:"omitempty,min=1"`
	PerPage       int                          `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search        string                       `form:"search"`
	Status        *financeModels.JournalStatus `form:"status" binding:"omitempty,oneof=draft posted"`
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
	Status            financeModels.JournalStatus `json:"status"`
	PostedAt          *time.Time                  `json:"posted_at"`
	PostedBy          *string                     `json:"posted_by"`
	IsSystemGenerated bool                        `json:"is_system_generated"`
	SourceDocumentURL *string                     `json:"source_document_url,omitempty"`
	Lines             []JournalLineResponse       `json:"lines"`
	DebitTotal        float64                     `json:"debit_total"`
	CreditTotal       float64                     `json:"credit_total"`
	CreatedAt         time.Time                   `json:"created_at"`
	UpdatedAt         time.Time                   `json:"updated_at"`
}

type TrialBalanceRow struct {
	ChartOfAccountID string                    `json:"chart_of_account_id"`
	Code             string                    `json:"code"`
	Name             string                    `json:"name"`
	Type             financeModels.AccountType `json:"type"`
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
	Page             int     `form:"page" binding:"omitempty,min=1"`
	PerPage          int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search           string  `form:"search"`
	ChartOfAccountID string  `form:"chart_of_account_id" binding:"omitempty,uuid"`
	AccountType      string  `form:"account_type"`
	ReferenceType    *string `form:"reference_type"`
	JournalStatus    string  `form:"journal_status" binding:"omitempty,oneof=draft posted"`
	StartDate        *string `form:"start_date"`
	EndDate          *string `form:"end_date"`
	SortBy           string  `form:"sort_by"`
	SortDir          string  `form:"sort_dir"`
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
