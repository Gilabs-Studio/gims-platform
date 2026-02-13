package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type CashBankJournalMapper struct {
	coaMapper *ChartOfAccountMapper
}

func NewCashBankJournalMapper(coaMapper *ChartOfAccountMapper) *CashBankJournalMapper {
	return &CashBankJournalMapper{coaMapper: coaMapper}
}

func (m *CashBankJournalMapper) ToResponse(item *financeModels.CashBankJournal) dto.CashBankJournalResponse {
	if item == nil {
		return dto.CashBankJournalResponse{}
	}

	resp := dto.CashBankJournalResponse{
		ID:              item.ID,
		TransactionDate: item.TransactionDate,
		Type:            item.Type,
		Description:     item.Description,
		BankAccountID:   item.BankAccountID,
		TotalAmount:     item.TotalAmount,
		Status:          item.Status,
		JournalEntryID:  item.JournalEntryID,
		PostedAt:        item.PostedAt,
		PostedBy:        item.PostedBy,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
	}

	if len(item.Lines) > 0 {
		resp.Lines = make([]dto.CashBankJournalLineResponse, 0, len(item.Lines))
		for _, ln := range item.Lines {
			var coaResp *dto.ChartOfAccountResponse
			if ln.ChartOfAccount != nil {
				mapped := m.coaMapper.ToResponse(ln.ChartOfAccount)
				coaResp = &mapped
			}
			resp.Lines = append(resp.Lines, dto.CashBankJournalLineResponse{
				ID:               ln.ID,
				ChartOfAccountID: ln.ChartOfAccountID,
				ChartOfAccount:   coaResp,
				ReferenceType:    ln.ReferenceType,
				ReferenceID:      ln.ReferenceID,
				Amount:           ln.Amount,
				Memo:             ln.Memo,
				CreatedAt:        ln.CreatedAt,
				UpdatedAt:        ln.UpdatedAt,
			})
		}
	}

	return resp
}
