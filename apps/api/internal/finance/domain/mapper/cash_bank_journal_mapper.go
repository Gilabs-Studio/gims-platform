package mapper

import (
	"strings"
	"time"

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

	if strings.TrimSpace(item.BankAccountNameSnapshot) != "" ||
		strings.TrimSpace(item.BankAccountNumberSnapshot) != "" ||
		strings.TrimSpace(item.BankAccountHolderSnapshot) != "" ||
		strings.TrimSpace(item.BankAccountCurrencySnapshot) != "" {
		resp.BankAccount = &dto.BankAccountMini{
			ID:            item.BankAccountID,
			Name:          strings.TrimSpace(item.BankAccountNameSnapshot),
			AccountNumber: strings.TrimSpace(item.BankAccountNumberSnapshot),
			AccountHolder: strings.TrimSpace(item.BankAccountHolderSnapshot),
			Currency:      strings.TrimSpace(item.BankAccountCurrencySnapshot),
		}
	}

	if len(item.Lines) > 0 {
		resp.Lines = make([]dto.CashBankJournalLineResponse, 0, len(item.Lines))
		for _, ln := range item.Lines {
			var coaResp *dto.ChartOfAccountResponse
			if strings.TrimSpace(ln.ChartOfAccountCodeSnapshot) != "" || strings.TrimSpace(ln.ChartOfAccountNameSnapshot) != "" || strings.TrimSpace(ln.ChartOfAccountTypeSnapshot) != "" {
				coaResp = &dto.ChartOfAccountResponse{
					ID:        ln.ChartOfAccountID,
					Code:      strings.TrimSpace(ln.ChartOfAccountCodeSnapshot),
					Name:      strings.TrimSpace(ln.ChartOfAccountNameSnapshot),
					Type:      financeModels.AccountType(strings.TrimSpace(ln.ChartOfAccountTypeSnapshot)),
					ParentID:  nil,
					IsActive:  true,
					CreatedAt: time.Time{},
					UpdatedAt: time.Time{},
				}
			} else if ln.ChartOfAccount != nil {
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
