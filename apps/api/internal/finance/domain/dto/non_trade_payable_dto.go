package dto

import "time"

type CreateNonTradePayableRequest struct {
	TransactionDate string  `json:"transaction_date" binding:"required"`
	Description     string  `json:"description"`
	ChartOfAccountID string `json:"chart_of_account_id" binding:"required,uuid"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	VendorName      string  `json:"vendor_name"`
	DueDate         *string `json:"due_date"`
	ReferenceNo     string  `json:"reference_no"`
}

type UpdateNonTradePayableRequest struct {
	TransactionDate string  `json:"transaction_date" binding:"required"`
	Description     string  `json:"description"`
	ChartOfAccountID string `json:"chart_of_account_id" binding:"required,uuid"`
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	VendorName      string  `json:"vendor_name"`
	DueDate         *string `json:"due_date"`
	ReferenceNo     string  `json:"reference_no"`
}

type ListNonTradePayablesRequest struct {
	Page    int    `form:"page" binding:"omitempty,min=1"`
	PerPage int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search  string `form:"search"`
	StartDate *string `form:"start_date"`
	EndDate *string `form:"end_date"`
	SortBy  string `form:"sort_by"`
	SortDir string `form:"sort_dir"`
}

type NonTradePayableResponse struct {
	ID string `json:"id"`
	TransactionDate time.Time `json:"transaction_date"`
	Description string `json:"description"`
	ChartOfAccountID string `json:"chart_of_account_id"`
	Amount float64 `json:"amount"`
	VendorName string `json:"vendor_name"`
	DueDate *time.Time `json:"due_date"`
	ReferenceNo string `json:"reference_no"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
