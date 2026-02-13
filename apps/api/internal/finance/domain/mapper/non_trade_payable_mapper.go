package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type NonTradePayableMapper struct{}

func NewNonTradePayableMapper() *NonTradePayableMapper {
	return &NonTradePayableMapper{}
}

func (m *NonTradePayableMapper) ToResponse(item *financeModels.NonTradePayable) dto.NonTradePayableResponse {
	if item == nil {
		return dto.NonTradePayableResponse{}
	}
	return dto.NonTradePayableResponse{
		ID: item.ID,
		TransactionDate: item.TransactionDate,
		Description: item.Description,
		ChartOfAccountID: item.ChartOfAccountID,
		Amount: item.Amount,
		VendorName: item.VendorName,
		DueDate: item.DueDate,
		ReferenceNo: item.ReferenceNo,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}
