package dto

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

// Request DTOs

type CreateAssetBudgetRequest struct {
	BudgetName  string                        `json:"budget_name" binding:"required"`
	Description string                        `json:"description"`
	FiscalYear  int                           `json:"fiscal_year" binding:"required"`
	StartDate   string                        `json:"start_date" binding:"required"`
	EndDate     string                        `json:"end_date" binding:"required"`
	Categories  []CreateBudgetCategoryRequest `json:"categories" binding:"required,dive"`
}

type CreateBudgetCategoryRequest struct {
	CategoryID      string  `json:"category_id" binding:"omitempty,uuid"`
	CategoryName    string  `json:"category_name" binding:"required"`
	AllocatedAmount float64 `json:"allocated_amount" binding:"required,gte=0"`
	Notes           string  `json:"notes"`
}

type UpdateAssetBudgetRequest struct {
	BudgetName  string                        `json:"budget_name" binding:"required"`
	Description string                        `json:"description"`
	StartDate   string                        `json:"start_date" binding:"required"`
	EndDate     string                        `json:"end_date" binding:"required"`
	Categories  []UpdateBudgetCategoryRequest `json:"categories" binding:"required,dive"`
}

type UpdateBudgetCategoryRequest struct {
	ID              *string `json:"id" binding:"omitempty,uuid"`
	CategoryID      string  `json:"category_id" binding:"omitempty,uuid"`
	CategoryName    string  `json:"category_name" binding:"required"`
	AllocatedAmount float64 `json:"allocated_amount" binding:"required,gte=0"`
	Notes           string  `json:"notes"`
}

type ChangeAssetBudgetStatusRequest struct {
	Status financeModels.AssetBudgetStatus `json:"status" binding:"required,oneof=draft active closed cancelled"`
}

type ListAssetBudgetsRequest struct {
	Page       int     `form:"page" binding:"omitempty,min=1"`
	PerPage    int     `form:"per_page" binding:"omitempty,min=1,max=100"`
	FiscalYear *int    `form:"fiscal_year"`
	Status     *string `form:"status"`
	Search     string  `form:"search"`
	SortBy     string  `form:"sort_by"`
	SortDir    string  `form:"sort_dir"`
}

// Response DTOs

type AssetBudgetResponse struct {
	ID          string                        `json:"id"`
	BudgetCode  string                        `json:"budget_code"`
	BudgetName  string                        `json:"budget_name"`
	Description string                        `json:"description"`
	FiscalYear  int                           `json:"fiscal_year"`
	StartDate   string                        `json:"start_date"`
	EndDate     string                        `json:"end_date"`
	TotalBudget float64                       `json:"total_budget"`
	Status      string                        `json:"status"`
	Categories  []AssetBudgetCategoryResponse `json:"categories,omitempty"`
	Summary     AssetBudgetSummaryResponse    `json:"summary,omitempty"`
	CreatedAt   string                        `json:"created_at"`
	UpdatedAt   string                        `json:"updated_at"`
}

type AssetBudgetCategoryResponse struct {
	ID              string  `json:"id"`
	CategoryID      *string `json:"category_id,omitempty"`
	CategoryName    string  `json:"category_name"`
	AllocatedAmount float64 `json:"allocated_amount"`
	UsedAmount      float64 `json:"used_amount"`
	CommittedAmount float64 `json:"committed_amount"`
	AvailableAmount float64 `json:"available_amount"`
	Notes           string  `json:"notes"`
}

type AssetBudgetSummaryResponse struct {
	TotalAllocated  float64 `json:"total_allocated"`
	TotalUsed       float64 `json:"total_used"`
	TotalCommitted  float64 `json:"total_committed"`
	TotalAvailable  float64 `json:"total_available"`
	UtilizationRate float64 `json:"utilization_rate"`
}

type AssetBudgetListResponse struct {
	Data []AssetBudgetResponse `json:"data"`
}

type AssetBudgetFormDataResponse struct {
	Categories []AssetCategoryMini `json:"categories"`
}

type AssetCategoryMini struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
