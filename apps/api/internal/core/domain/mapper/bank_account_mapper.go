package mapper

import (
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/domain/dto"
)

type BankAccountMapper struct{}

func NewBankAccountMapper() *BankAccountMapper {
	return &BankAccountMapper{}
}

func (m *BankAccountMapper) ToResponse(model *models.BankAccount) *dto.BankAccountResponse {
	if model == nil {
		return nil
	}
	return &dto.BankAccountResponse{
		ID:               model.ID,
		Name:             model.Name,
		AccountNumber:    model.AccountNumber,
		AccountHolder:    model.AccountHolder,
		Currency:         model.Currency,
		ChartOfAccountID: model.ChartOfAccountID,
		VillageID:        model.VillageID,
		BankAddress:      model.BankAddress,
		BankPhone:        model.BankPhone,
		IsActive:         model.IsActive,
		CreatedAt:        model.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        model.UpdatedAt.Format(time.RFC3339),
	}
}

func (m *BankAccountMapper) ToResponseList(items []models.BankAccount) []*dto.BankAccountResponse {
	out := make([]*dto.BankAccountResponse, 0, len(items))
	for i := range items {
		out = append(out, m.ToResponse(&items[i]))
	}
	return out
}
