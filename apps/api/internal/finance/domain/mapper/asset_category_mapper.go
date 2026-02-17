package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type AssetCategoryMapper struct{}

func NewAssetCategoryMapper() *AssetCategoryMapper {
	return &AssetCategoryMapper{}
}

func (m *AssetCategoryMapper) ToResponse(item *financeModels.AssetCategory) dto.AssetCategoryResponse {
	if item == nil {
		return dto.AssetCategoryResponse{}
	}
	return dto.AssetCategoryResponse{
		ID: item.ID,
		Name: item.Name,
		DepreciationMethod: item.DepreciationMethod,
		UsefulLifeMonths: item.UsefulLifeMonths,
		DepreciationRate: item.DepreciationRate,
		AssetAccountID: item.AssetAccountID,
		AccumulatedDepreciationAccountID: item.AccumulatedDepreciationAccountID,
		DepreciationExpenseAccountID: item.DepreciationExpenseAccountID,
		IsActive: item.IsActive,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}
