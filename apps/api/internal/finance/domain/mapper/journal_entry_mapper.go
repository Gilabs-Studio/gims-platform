package mapper

import (
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
)

type JournalEntryMapper struct {
	coaMapper *ChartOfAccountMapper
}

func NewJournalEntryMapper(coaMapper *ChartOfAccountMapper) *JournalEntryMapper {
	return &JournalEntryMapper{coaMapper: coaMapper}
}

func (m *JournalEntryMapper) ToResponse(item *financeModels.JournalEntry) dto.JournalEntryResponse {
	if item == nil {
		return dto.JournalEntryResponse{}
	}

	lines := make([]dto.JournalLineResponse, 0, len(item.Lines))
	var debitTotal float64
	var creditTotal float64
	for _, ln := range item.Lines {
		debitTotal += ln.Debit
		creditTotal += ln.Credit

		var coaResp *dto.ChartOfAccountResponse
		if ln.ChartOfAccount != nil {
			v := m.coaMapper.ToResponse(ln.ChartOfAccount)
			coaResp = &v
		}
		lines = append(lines, dto.JournalLineResponse{
			ID:               ln.ID,
			ChartOfAccountID: ln.ChartOfAccountID,
			ChartOfAccount:   coaResp,
			Debit:            ln.Debit,
			Credit:           ln.Credit,
			Memo:             ln.Memo,
		})
	}

	return dto.JournalEntryResponse{
		ID:            item.ID,
		EntryDate:     item.EntryDate,
		Description:   item.Description,
		ReferenceType: item.ReferenceType,
		ReferenceID:   item.ReferenceID,
		Status:        item.Status,
		PostedAt:      item.PostedAt,
		PostedBy:      item.PostedBy,
		Lines:         lines,
		DebitTotal:    debitTotal,
		CreditTotal:   creditTotal,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}

func (m *JournalEntryMapper) ToSummaryResponse(item *financeModels.JournalEntry) dto.JournalEntryResponse {
	if item == nil {
		return dto.JournalEntryResponse{}
	}

	var debitTotal float64
	var creditTotal float64
	for _, ln := range item.Lines {
		debitTotal += ln.Debit
		creditTotal += ln.Credit
	}

	return dto.JournalEntryResponse{
		ID:            item.ID,
		EntryDate:     item.EntryDate,
		Description:   item.Description,
		ReferenceType: item.ReferenceType,
		ReferenceID:   item.ReferenceID,
		Status:        item.Status,
		PostedAt:      item.PostedAt,
		PostedBy:      item.PostedBy,
		Lines:         []dto.JournalLineResponse{},
		DebitTotal:    debitTotal,
		CreditTotal:   creditTotal,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
	}
}
