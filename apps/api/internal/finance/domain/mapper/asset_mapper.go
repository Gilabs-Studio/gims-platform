package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type AssetMapper struct {
	categoryMapper *AssetCategoryMapper
	locationMapper *AssetLocationMapper
}

func NewAssetMapper(categoryMapper *AssetCategoryMapper, locationMapper *AssetLocationMapper) *AssetMapper {
	return &AssetMapper{categoryMapper: categoryMapper, locationMapper: locationMapper}
}

func (m *AssetMapper) ToResponse(item *financeModels.Asset, withDetails bool) dto.AssetResponse {
	if item == nil {
		return dto.AssetResponse{}
	}

	resp := dto.AssetResponse{
		ID: item.ID,
		Code: item.Code,
		Name: item.Name,
		CategoryID: item.CategoryID,
		LocationID: item.LocationID,
		AcquisitionDate: item.AcquisitionDate,
		AcquisitionCost: item.AcquisitionCost,
		SalvageValue: item.SalvageValue,
		AccumulatedDepreciation: item.AccumulatedDepreciation,
		BookValue: item.BookValue,
		Status: item.Status,
		DisposedAt: item.DisposedAt,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}

	if item.Category != nil {
		cat := m.categoryMapper.ToResponse(item.Category)
		resp.Category = &cat
	}
	if item.Location != nil {
		loc := m.locationMapper.ToResponse(item.Location)
		resp.Location = &loc
	}

	if withDetails {
		deps := make([]dto.AssetDepreciationResponse, 0, len(item.Depreciations))
		for i := range item.Depreciations {
			d := item.Depreciations[i]
			deps = append(deps, dto.AssetDepreciationResponse{
				ID: d.ID,
				AssetID: d.AssetID,
				Period: d.Period,
				DepreciationDate: d.DepreciationDate,
				Method: d.Method,
				Amount: d.Amount,
				Accumulated: d.Accumulated,
				BookValue: d.BookValue,
				JournalEntryID: d.JournalEntryID,
				CreatedAt: d.CreatedAt,
			})
		}
		resp.Depreciations = deps

		txs := make([]dto.AssetTransactionResponse, 0, len(item.Transactions))
		for i := range item.Transactions {
			t := item.Transactions[i]
			txs = append(txs, dto.AssetTransactionResponse{
				ID: t.ID,
				AssetID: t.AssetID,
				Type: t.Type,
				TransactionDate: t.TransactionDate,
				Description: t.Description,
				ReferenceType: t.ReferenceType,
				ReferenceID: t.ReferenceID,
				CreatedAt: t.CreatedAt,
			})
		}
		resp.Transactions = txs
	}

	return resp
}
