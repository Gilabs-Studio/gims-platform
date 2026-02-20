package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

type CreateAssetCategoryRequest struct {
	Name string `json:"name" binding:"required"`

	DepreciationMethod financeModels.DepreciationMethod `json:"depreciation_method" binding:"required,oneof=SL DB"`
	UsefulLifeMonths   int                              `json:"useful_life_months" binding:"required,gt=0"`
	DepreciationRate   float64                          `json:"depreciation_rate" binding:"omitempty,gt=0"`

	AssetAccountID                     string `json:"asset_account_id" binding:"required,uuid"`
	AccumulatedDepreciationAccountID   string `json:"accumulated_depreciation_account_id" binding:"required,uuid"`
	DepreciationExpenseAccountID       string `json:"depreciation_expense_account_id" binding:"required,uuid"`

	IsActive *bool `json:"is_active"`
}

type UpdateAssetCategoryRequest struct {
	Name string `json:"name" binding:"required"`

	DepreciationMethod financeModels.DepreciationMethod `json:"depreciation_method" binding:"required,oneof=SL DB"`
	UsefulLifeMonths   int                              `json:"useful_life_months" binding:"required,gt=0"`
	DepreciationRate   float64                          `json:"depreciation_rate" binding:"omitempty,gt=0"`

	AssetAccountID                     string `json:"asset_account_id" binding:"required,uuid"`
	AccumulatedDepreciationAccountID   string `json:"accumulated_depreciation_account_id" binding:"required,uuid"`
	DepreciationExpenseAccountID       string `json:"depreciation_expense_account_id" binding:"required,uuid"`

	IsActive *bool `json:"is_active"`
}

type ListAssetCategoriesRequest struct {
	Page    int    `form:"page" binding:"omitempty,min=1"`
	PerPage int    `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search  string `form:"search"`
	SortBy  string `form:"sort_by"`
	SortDir string `form:"sort_dir"`
}

type AssetCategoryResponse struct {
	ID string `json:"id"`
	Name string `json:"name"`

	DepreciationMethod financeModels.DepreciationMethod `json:"depreciation_method"`
	UsefulLifeMonths   int                              `json:"useful_life_months"`
	DepreciationRate   float64                          `json:"depreciation_rate"`

	AssetAccountID                   string `json:"asset_account_id"`
	AccumulatedDepreciationAccountID string `json:"accumulated_depreciation_account_id"`
	DepreciationExpenseAccountID     string `json:"depreciation_expense_account_id"`

	IsActive bool `json:"is_active"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
