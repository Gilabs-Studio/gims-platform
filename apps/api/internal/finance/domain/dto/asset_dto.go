package dto

import (
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
)

type CreateAssetRequest struct {
	Code string `json:"code" binding:"required"`
	Name string `json:"name" binding:"required"`

	CategoryID string `json:"category_id" binding:"required,uuid"`
	LocationID string `json:"location_id" binding:"required,uuid"`

	AcquisitionDate string  `json:"acquisition_date" binding:"required"`
	AcquisitionCost float64 `json:"acquisition_cost" binding:"required,gt=0"`
	SalvageValue    float64 `json:"salvage_value" binding:"omitempty,gte=0"`
}

type UpdateAssetRequest struct {
	Code string `json:"code" binding:"required"`
	Name string `json:"name" binding:"required"`

	CategoryID string `json:"category_id" binding:"required,uuid"`
	LocationID string `json:"location_id" binding:"required,uuid"`

	AcquisitionDate string                    `json:"acquisition_date" binding:"required"`
	AcquisitionCost float64                   `json:"acquisition_cost" binding:"required,gt=0"`
	SalvageValue    float64                   `json:"salvage_value" binding:"omitempty,gte=0"`
	Status          financeModels.AssetStatus `json:"status" binding:"omitempty,oneof=active disposed"`
}

type ListAssetsRequest struct {
	Page       int                        `form:"page" binding:"omitempty,min=1"`
	PerPage    int                        `form:"per_page" binding:"omitempty,min=1,max=100"`
	Search     string                     `form:"search"`
	Status     *financeModels.AssetStatus `form:"status" binding:"omitempty,oneof=active disposed"`
	CategoryID *string                    `form:"category_id"`
	LocationID *string                    `form:"location_id"`
	StartDate  *string                    `form:"start_date"`
	EndDate    *string                    `form:"end_date"`
	SortBy     string                     `form:"sort_by"`
	SortDir    string                     `form:"sort_dir"`
}

type DepreciateAssetRequest struct {
	AsOfDate string `json:"as_of_date" binding:"required"`
}

type TransferAssetRequest struct {
	LocationID   string `json:"location_id" binding:"required,uuid"`
	TransferDate string `json:"transfer_date" binding:"required"`
	Description  string `json:"description"`
}

type DisposeAssetRequest struct {
	DisposalDate string `json:"disposal_date" binding:"required"`
	Description  string `json:"description"`
}

type AssetDepreciationResponse struct {
	ID               string                           `json:"id"`
	AssetID          string                           `json:"asset_id"`
	Period           string                           `json:"period"`
	DepreciationDate time.Time                        `json:"depreciation_date"`
	Method           financeModels.DepreciationMethod `json:"method"`
	Amount           float64                          `json:"amount"`
	Accumulated      float64                          `json:"accumulated"`
	BookValue        float64                          `json:"book_value"`
	JournalEntryID   *string                          `json:"journal_entry_id"`
	CreatedAt        time.Time                        `json:"created_at"`
}

type AssetTransactionResponse struct {
	ID              string                             `json:"id"`
	AssetID         string                             `json:"asset_id"`
	Type            financeModels.AssetTransactionType `json:"type"`
	TransactionDate time.Time                          `json:"transaction_date"`
	Amount          float64                            `json:"amount"`
	Description     string                             `json:"description"`
	Status          string                             `json:"status"`
	ReferenceType   *string                            `json:"reference_type"`
	ReferenceID     *string                            `json:"reference_id"`
	CreatedAt       time.Time                          `json:"created_at"`
}

type RevalueAssetRequest struct {
	RevaluationDate string  `json:"revaluation_date" binding:"required"`
	NewValue        float64 `json:"new_value" binding:"required,gt=0"`
	Description     string  `json:"description"`
}

type AdjustAssetRequest struct {
	AdjustmentDate   string  `json:"adjustment_date" binding:"required"`
	AdjustmentAmount float64 `json:"adjustment_amount" binding:"required"`
	Description      string  `json:"description"`
}

type AssetResponse struct {
	ID                      string                      `json:"id"`
	Code                    string                      `json:"code"`
	Name                    string                      `json:"name"`
	CategoryID              string                      `json:"category_id"`
	Category                *AssetCategoryResponse      `json:"category,omitempty"`
	LocationID              string                      `json:"location_id"`
	Location                *AssetLocationResponse      `json:"location,omitempty"`
	AcquisitionDate         time.Time                   `json:"acquisition_date"`
	AcquisitionCost         float64                     `json:"acquisition_cost"`
	SalvageValue            float64                     `json:"salvage_value"`
	AccumulatedDepreciation float64                     `json:"accumulated_depreciation"`
	BookValue               float64                     `json:"book_value"`
	Status                  financeModels.AssetStatus   `json:"status"`
	DisposedAt              *time.Time                  `json:"disposed_at"`
	CreatedAt               time.Time                   `json:"created_at"`
	UpdatedAt               time.Time                   `json:"updated_at"`
	Depreciations           []AssetDepreciationResponse `json:"depreciations,omitempty"`
	Transactions            []AssetTransactionResponse  `json:"transactions,omitempty"`
}

type CreateAssetFromPurchaseRequest struct {
	Code            string  `json:"code"`
	Name            string  `json:"name"`
	AcquisitionDate string  `json:"acquisition_date"`
	AcquisitionCost float64 `json:"acquisition_cost"`
	ReferenceType   string  `json:"reference_type"`
	ReferenceID     string  `json:"reference_id"`
	CategoryID      *string `json:"category_id"`
	LocationID      *string `json:"location_id"`
}
