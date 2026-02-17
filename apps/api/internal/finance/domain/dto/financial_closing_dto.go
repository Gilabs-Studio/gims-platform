package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

type CreateFinancialClosingRequest struct {
	PeriodEndDate string `json:"period_end_date" binding:"required"`
	Notes         string `json:"notes"`
}

type ListFinancialClosingsRequest struct {
	Page    int    `form:"page" binding:"omitempty,min=1"`
	PerPage int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	SortBy  string `form:"sort_by"`
	SortDir string `form:"sort_dir"`
}

type FinancialClosingResponse struct {
	ID string `json:"id"`
	PeriodEndDate time.Time `json:"period_end_date"`
	Status financeModels.FinancialClosingStatus `json:"status"`
	Notes string `json:"notes"`
	ApprovedAt *time.Time `json:"approved_at"`
	ApprovedBy *string `json:"approved_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
