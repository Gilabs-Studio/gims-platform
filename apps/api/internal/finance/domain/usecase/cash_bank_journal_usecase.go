package usecase

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrCashBankNotFound        = errors.New("cash bank journal not found")
	ErrCashBankPostedImmutable = errors.New("posted cash bank journal cannot be modified")
	ErrCashBankInvalidLines    = errors.New("invalid cash bank journal lines")
)

type CashBankJournalUsecase interface {
	Create(ctx context.Context, req *dto.CreateCashBankJournalRequest) (*dto.CashBankJournalResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateCashBankJournalRequest) (*dto.CashBankJournalResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.CashBankJournalResponse, error)
	List(ctx context.Context, req *dto.ListCashBankJournalsRequest) ([]dto.CashBankJournalResponse, int64, error)
	Post(ctx context.Context, id string) (*dto.CashBankJournalResponse, error)
}

type cashBankJournalUsecase struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
	repo    repositories.CashBankJournalRepository
	mapper  *mapper.CashBankJournalMapper
}

func NewCashBankJournalUsecase(db *gorm.DB, coaRepo repositories.ChartOfAccountRepository, repo repositories.CashBankJournalRepository, mapper *mapper.CashBankJournalMapper) CashBankJournalUsecase {
	return &cashBankJournalUsecase{db: db, coaRepo: coaRepo, repo: repo, mapper: mapper}
}

func validateCashBankLines(lines []dto.CashBankJournalLineRequest) (float64, error) {
	if len(lines) < 1 {
		return 0, ErrCashBankInvalidLines
	}
	var sum float64
	for _, ln := range lines {
		if strings.TrimSpace(ln.ChartOfAccountID) == "" {
			return 0, ErrCashBankInvalidLines
		}
		if ln.Amount <= 0 {
			return 0, ErrCashBankInvalidLines
		}
		sum += ln.Amount
	}
	return sum, nil
}

func (uc *cashBankJournalUsecase) Create(ctx context.Context, req *dto.CreateCashBankJournalRequest) (*dto.CashBankJournalResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	trxDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.TransactionDate))
	if err != nil {
		return nil, errors.New("invalid transaction_date")
	}
	if req.Type != financeModels.CashBankTypeCashIn && req.Type != financeModels.CashBankTypeCashOut {
		return nil, errors.New("invalid type")
	}

	sum, err := validateCashBankLines(req.Lines)
	if err != nil {
		return nil, err
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	bankAccountID := strings.TrimSpace(req.BankAccountID)
	if bankAccountID == "" {
		return nil, errors.New("bank_account_id is required")
	}
	var bank coreModels.BankAccount
	if err := uc.db.WithContext(ctx).First(&bank, "id = ?", bankAccountID).Error; err != nil {
		return nil, err
	}

	var createdID string
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		coaIDs := make([]string, 0, len(req.Lines))
		for _, ln := range req.Lines {
			coaIDs = append(coaIDs, strings.TrimSpace(ln.ChartOfAccountID))
		}
		coaByID, err := loadCOAMap(tx.WithContext(ctx), coaIDs)
		if err != nil {
			return err
		}
		for _, ln := range req.Lines {
			if coaByID[strings.TrimSpace(ln.ChartOfAccountID)] == nil {
				return errors.New("chart of account not found")
			}
		}

		cb := &financeModels.CashBankJournal{
			TransactionDate: trxDate,
			Type:            req.Type,
			Description:     strings.TrimSpace(req.Description),
			BankAccountID:   bankAccountID,
			BankAccountNameSnapshot:     strings.TrimSpace(bank.Name),
			BankAccountNumberSnapshot:   strings.TrimSpace(bank.AccountNumber),
			BankAccountHolderSnapshot:   strings.TrimSpace(bank.AccountHolder),
			BankAccountCurrencySnapshot: strings.TrimSpace(bank.Currency),
			TotalAmount:     sum,
			Status:          financeModels.CashBankStatusDraft,
			CreatedBy:       &actorID,
		}
		if err := tx.Create(cb).Error; err != nil {
			return err
		}
		for _, ln := range req.Lines {
			coa := coaByID[strings.TrimSpace(ln.ChartOfAccountID)]
			codeSnap := ""
			nameSnap := ""
			typeSnap := ""
			snapshotCOAIntoLine(&codeSnap, &nameSnap, &typeSnap, coa)
			item := &financeModels.CashBankJournalLine{
				CashBankJournalID: cb.ID,
				ChartOfAccountID:  strings.TrimSpace(ln.ChartOfAccountID),
				ChartOfAccountCodeSnapshot: codeSnap,
				ChartOfAccountNameSnapshot: nameSnap,
				ChartOfAccountTypeSnapshot: typeSnap,
				ReferenceType:     ln.ReferenceType,
				ReferenceID:       ln.ReferenceID,
				Amount:            ln.Amount,
				Memo:              strings.TrimSpace(ln.Memo),
			}
			if err := tx.Create(item).Error; err != nil {
				return err
			}
		}
		createdID = cb.ID
		return nil
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, createdID, true)
	if err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(full)
	return &resp, nil
}

func (uc *cashBankJournalUsecase) Update(ctx context.Context, id string, req *dto.UpdateCashBankJournalRequest) (*dto.CashBankJournalResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	cb, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCashBankNotFound
		}
		return nil, err
	}
	if cb.Status == financeModels.CashBankStatusPosted {
		return nil, ErrCashBankPostedImmutable
	}

	trxDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.TransactionDate))
	if err != nil {
		return nil, errors.New("invalid transaction_date")
	}
	if req.Type != financeModels.CashBankTypeCashIn && req.Type != financeModels.CashBankTypeCashOut {
		return nil, errors.New("invalid type")
	}

	sum, err := validateCashBankLines(req.Lines)
	if err != nil {
		return nil, err
	}
	if math.Abs(sum) < 0.000001 {
		return nil, ErrCashBankInvalidLines
	}

	bankAccountID := strings.TrimSpace(req.BankAccountID)
	if bankAccountID == "" {
		return nil, errors.New("bank_account_id is required")
	}
	var bank coreModels.BankAccount
	if err := uc.db.WithContext(ctx).First(&bank, "id = ?", bankAccountID).Error; err != nil {
		return nil, err
	}

	bankNameSnap := cb.BankAccountNameSnapshot
	bankNumberSnap := cb.BankAccountNumberSnapshot
	bankHolderSnap := cb.BankAccountHolderSnapshot
	bankCurrencySnap := cb.BankAccountCurrencySnapshot
	if strings.TrimSpace(bankAccountID) != strings.TrimSpace(cb.BankAccountID) {
		bankNameSnap = strings.TrimSpace(bank.Name)
		bankNumberSnap = strings.TrimSpace(bank.AccountNumber)
		bankHolderSnap = strings.TrimSpace(bank.AccountHolder)
		bankCurrencySnap = strings.TrimSpace(bank.Currency)
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		coaIDs := make([]string, 0, len(req.Lines))
		for _, ln := range req.Lines {
			coaIDs = append(coaIDs, strings.TrimSpace(ln.ChartOfAccountID))
		}
		coaByID, err := loadCOAMap(tx.WithContext(ctx), coaIDs)
		if err != nil {
			return err
		}
		for _, ln := range req.Lines {
			if coaByID[strings.TrimSpace(ln.ChartOfAccountID)] == nil {
				return errors.New("chart of account not found")
			}
		}

		if err := tx.Model(&financeModels.CashBankJournal{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"transaction_date": trxDate,
				"type":             req.Type,
				"description":      strings.TrimSpace(req.Description),
				"bank_account_id":  bankAccountID,
				"bank_account_name_snapshot":     bankNameSnap,
				"bank_account_number_snapshot":   bankNumberSnap,
				"bank_account_holder_snapshot":   bankHolderSnap,
				"bank_account_currency_snapshot": bankCurrencySnap,
				"total_amount":     sum,
			}).Error; err != nil {
			return err
		}

		if err := tx.Where("cash_bank_journal_id = ?", id).Delete(&financeModels.CashBankJournalLine{}).Error; err != nil {
			return err
		}
		for _, ln := range req.Lines {
			coa := coaByID[strings.TrimSpace(ln.ChartOfAccountID)]
			codeSnap := ""
			nameSnap := ""
			typeSnap := ""
			snapshotCOAIntoLine(&codeSnap, &nameSnap, &typeSnap, coa)
			item := &financeModels.CashBankJournalLine{
				CashBankJournalID: id,
				ChartOfAccountID:  strings.TrimSpace(ln.ChartOfAccountID),
				ChartOfAccountCodeSnapshot: codeSnap,
				ChartOfAccountNameSnapshot: nameSnap,
				ChartOfAccountTypeSnapshot: typeSnap,
				ReferenceType:     ln.ReferenceType,
				ReferenceID:       ln.ReferenceID,
				Amount:            ln.Amount,
				Memo:              strings.TrimSpace(ln.Memo),
			}
			if err := tx.Create(item).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(full)
	return &resp, nil
}

func (uc *cashBankJournalUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	cb, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrCashBankNotFound
		}
		return err
	}
	if cb.Status == financeModels.CashBankStatusPosted {
		return ErrCashBankPostedImmutable
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.CashBankJournal{}, "id = ?", id).Error
}

func (uc *cashBankJournalUsecase) GetByID(ctx context.Context, id string) (*dto.CashBankJournalResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	item, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCashBankNotFound
		}
		return nil, err
	}
	resp := uc.mapper.ToResponse(item)
	return &resp, nil
}

func (uc *cashBankJournalUsecase) List(ctx context.Context, req *dto.ListCashBankJournalsRequest) ([]dto.CashBankJournalResponse, int64, error) {
	if req == nil {
		req = &dto.ListCashBankJournalsRequest{}
	}
	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	var startDate *time.Time
	if req.StartDate != nil && strings.TrimSpace(*req.StartDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.StartDate))
		if err != nil {
			return nil, 0, errors.New("invalid start_date")
		}
		startDate = &parsed
	}
	var endDate *time.Time
	if req.EndDate != nil && strings.TrimSpace(*req.EndDate) != "" {
		parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*req.EndDate))
		if err != nil {
			return nil, 0, errors.New("invalid end_date")
		}
		endDate = &parsed
	}

	items, total, err := uc.repo.List(ctx, repositories.CashBankJournalListParams{
		Search:    req.Search,
		Type:      req.Type,
		Status:    req.Status,
		StartDate: startDate,
		EndDate:   endDate,
		SortBy:    req.SortBy,
		SortDir:   req.SortDir,
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.CashBankJournalResponse, 0, len(items))
	for i := range items {
		mapped := uc.mapper.ToResponse(&items[i])
		res = append(res, mapped)
	}
	return res, total, nil
}

func (uc *cashBankJournalUsecase) Post(ctx context.Context, id string) (*dto.CashBankJournalResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	cb, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrCashBankNotFound
		}
		return nil, err
	}
	if cb.Status == financeModels.CashBankStatusPosted {
		resp := uc.mapper.ToResponse(cb)
		return &resp, nil
	}

	var bank coreModels.BankAccount
	if err := uc.db.WithContext(ctx).First(&bank, "id = ?", cb.BankAccountID).Error; err != nil {
		return nil, err
	}
	if bank.ChartOfAccountID == nil || strings.TrimSpace(*bank.ChartOfAccountID) == "" {
		return nil, errors.New("bank account is not linked to chart_of_account_id")
	}
	bankCOAID := strings.TrimSpace(*bank.ChartOfAccountID)

	var postedID string
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, cb.TransactionDate); err != nil {
			return err
		}
		now := time.Now()
		refType := "cash_bank"

		je := &financeModels.JournalEntry{
			EntryDate:     cb.TransactionDate,
			Description:   strings.TrimSpace(cb.Description),
			ReferenceType: &refType,
			ReferenceID:   &cb.ID,
			Status:        financeModels.JournalStatusPosted,
			PostedAt:      &now,
			PostedBy:      &actorID,
			CreatedBy:     &actorID,
		}
		if err := tx.Create(je).Error; err != nil {
			return err
		}

		if cb.Type == financeModels.CashBankTypeCashIn {
			bankDebit := &financeModels.JournalLine{
				JournalEntryID:   je.ID,
				ChartOfAccountID: bankCOAID,
				Debit:            cb.TotalAmount,
				Credit:           0,
				Memo:             "Cash/Bank inflow",
			}
			if err := tx.Create(bankDebit).Error; err != nil {
				return err
			}
			for _, ln := range cb.Lines {
				credit := &financeModels.JournalLine{
					JournalEntryID:   je.ID,
					ChartOfAccountID: ln.ChartOfAccountID,
					Debit:            0,
					Credit:           ln.Amount,
					Memo:             strings.TrimSpace(ln.Memo),
				}
				if err := tx.Create(credit).Error; err != nil {
					return err
				}
			}
		} else {
			bankCredit := &financeModels.JournalLine{
				JournalEntryID:   je.ID,
				ChartOfAccountID: bankCOAID,
				Debit:            0,
				Credit:           cb.TotalAmount,
				Memo:             "Cash/Bank outflow",
			}
			if err := tx.Create(bankCredit).Error; err != nil {
				return err
			}
			for _, ln := range cb.Lines {
				debit := &financeModels.JournalLine{
					JournalEntryID:   je.ID,
					ChartOfAccountID: ln.ChartOfAccountID,
					Debit:            ln.Amount,
					Credit:           0,
					Memo:             strings.TrimSpace(ln.Memo),
				}
				if err := tx.Create(debit).Error; err != nil {
					return err
				}
			}
		}

		if err := tx.Model(&financeModels.CashBankJournal{}).
			Where("id = ?", cb.ID).
			Updates(map[string]interface{}{
				"status":           financeModels.CashBankStatusPosted,
				"journal_entry_id": je.ID,
				"posted_at":        now,
				"posted_by":        actorID,
			}).Error; err != nil {
			return err
		}
		postedID = cb.ID
		return nil
	})
	if err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, postedID, true)
	if err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(full)
	return &resp, nil
}
