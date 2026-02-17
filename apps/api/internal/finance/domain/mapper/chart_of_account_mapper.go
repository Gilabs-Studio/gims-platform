package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type ChartOfAccountMapper struct{}

func NewChartOfAccountMapper() *ChartOfAccountMapper {
	return &ChartOfAccountMapper{}
}

func (m *ChartOfAccountMapper) ToResponse(item *financeModels.ChartOfAccount) dto.ChartOfAccountResponse {
	if item == nil {
		return dto.ChartOfAccountResponse{}
	}
	return dto.ChartOfAccountResponse{
		ID:        item.ID,
		Code:      item.Code,
		Name:      item.Name,
		Type:      item.Type,
		ParentID:  item.ParentID,
		IsActive:  item.IsActive,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}
