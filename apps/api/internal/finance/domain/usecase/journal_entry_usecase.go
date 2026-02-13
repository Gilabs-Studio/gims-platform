package usecase

import (
	"context"
	"errors"
	"math"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrJournalNotFound        = errors.New("journal entry not found")
	ErrJournalPostedImmutable = errors.New("posted journal entry cannot be modified")
	ErrJournalUnbalanced      = errors.New("journal entry must be balanced (debit = credit)")
	ErrJournalInvalidLines    = errors.New("invalid journal lines")
)

type JournalEntryUsecase interface {
	Create(ctx context.Context, req *dto.CreateJournalEntryRequest) (*dto.JournalEntryResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateJournalEntryRequest) (*dto.JournalEntryResponse, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*dto.JournalEntryResponse, error)
	List(ctx context.Context, req *dto.ListJournalEntriesRequest) ([]dto.JournalEntryResponse, int64, error)
	Post(ctx context.Context, id string) (*dto.JournalEntryResponse, error)
	TrialBalance(ctx context.Context, startDate, endDate *time.Time) (*dto.TrialBalanceResponse, error)
}

type journalEntryUsecase struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
	repo    repositories.JournalEntryRepository
	mapper  *mapper.JournalEntryMapper
}

func NewJournalEntryUsecase(db *gorm.DB, coaRepo repositories.ChartOfAccountRepository, repo repositories.JournalEntryRepository, mapper *mapper.JournalEntryMapper) JournalEntryUsecase {
	return &journalEntryUsecase{db: db, coaRepo: coaRepo, repo: repo, mapper: mapper}
}

func parseDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, errors.New("date is required")
	}
	return time.Parse("2006-01-02", value)
}

func validateLines(lines []dto.JournalLineRequest) (float64, float64, error) {
	if len(lines) < 2 {
		return 0, 0, ErrJournalInvalidLines
	}
	var debitTotal float64
	var creditTotal float64
	for _, ln := range lines {
		if strings.TrimSpace(ln.ChartOfAccountID) == "" {
			return 0, 0, ErrJournalInvalidLines
		}
		if ln.Debit < 0 || ln.Credit < 0 {
			return 0, 0, ErrJournalInvalidLines
		}
		if (ln.Debit > 0 && ln.Credit > 0) || (ln.Debit == 0 && ln.Credit == 0) {
			return 0, 0, ErrJournalInvalidLines
		}
		debitTotal += ln.Debit
		creditTotal += ln.Credit
	}
	if math.Abs(debitTotal-creditTotal) > 0.000001 {
		return debitTotal, creditTotal, ErrJournalUnbalanced
	}
	return debitTotal, creditTotal, nil
}

func (uc *journalEntryUsecase) Create(ctx context.Context, req *dto.CreateJournalEntryRequest) (*dto.JournalEntryResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	entryDate, err := parseDate(req.EntryDate)
	if err != nil {
		return nil, err
	}
	if _, _, err := validateLines(req.Lines); err != nil {
		return nil, err
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	var createdID string
	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, entryDate); err != nil {
			return err
		}
		for _, ln := range req.Lines {
			if _, err := uc.coaRepo.FindByID(ctx, ln.ChartOfAccountID); err != nil {
				return err
			}
		}

		entry := &financeModels.JournalEntry{
			EntryDate:     entryDate,
			Description:   strings.TrimSpace(req.Description),
			ReferenceType: req.ReferenceType,
			ReferenceID:   req.ReferenceID,
			Status:        financeModels.JournalStatusDraft,
			CreatedBy:     &actorID,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}
		for _, ln := range req.Lines {
			line := &financeModels.JournalLine{
				JournalEntryID:   entry.ID,
				ChartOfAccountID: ln.ChartOfAccountID,
				Debit:            ln.Debit,
				Credit:           ln.Credit,
				Memo:             strings.TrimSpace(ln.Memo),
			}
			if err := tx.Create(line).Error; err != nil {
				return err
			}
		}
		createdID = entry.ID
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

func (uc *journalEntryUsecase) Update(ctx context.Context, id string, req *dto.UpdateJournalEntryRequest) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	entry, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	if entry.Status == financeModels.JournalStatusPosted {
		return nil, ErrJournalPostedImmutable
	}

	entryDate, err := parseDate(req.EntryDate)
	if err != nil {
		return nil, err
	}
	if _, _, err := validateLines(req.Lines); err != nil {
		return nil, err
	}

	err = uc.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, entryDate); err != nil {
			return err
		}
		if err := tx.Model(&financeModels.JournalEntry{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"entry_date":     entryDate,
				"description":    strings.TrimSpace(req.Description),
				"reference_type": req.ReferenceType,
				"reference_id":   req.ReferenceID,
			}).Error; err != nil {
			return err
		}

		if err := tx.Where("journal_entry_id = ?", id).Delete(&financeModels.JournalLine{}).Error; err != nil {
			return err
		}

		for _, ln := range req.Lines {
			line := &financeModels.JournalLine{
				JournalEntryID:   id,
				ChartOfAccountID: ln.ChartOfAccountID,
				Debit:            ln.Debit,
				Credit:           ln.Credit,
				Memo:             strings.TrimSpace(ln.Memo),
			}
			if err := tx.Create(line).Error; err != nil {
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

func (uc *journalEntryUsecase) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return errors.New("id is required")
	}
	entry, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ErrJournalNotFound
		}
		return err
	}
	if entry.Status == financeModels.JournalStatusPosted {
		return ErrJournalPostedImmutable
	}
	return uc.db.WithContext(ctx).Delete(&financeModels.JournalEntry{}, "id = ?", id).Error
}

func (uc *journalEntryUsecase) GetByID(ctx context.Context, id string) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	item, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	resp := uc.mapper.ToResponse(item)
	return &resp, nil
}

func (uc *journalEntryUsecase) List(ctx context.Context, req *dto.ListJournalEntriesRequest) ([]dto.JournalEntryResponse, int64, error) {
	if req == nil {
		req = &dto.ListJournalEntriesRequest{}
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
		v, err := parseDate(*req.StartDate)
		if err != nil {
			return nil, 0, err
		}
		startDate = &v
	}
	var endDate *time.Time
	if req.EndDate != nil && strings.TrimSpace(*req.EndDate) != "" {
		v, err := parseDate(*req.EndDate)
		if err != nil {
			return nil, 0, err
		}
		endDate = &v
	}

	params := repositories.JournalEntryListParams{
		Search:    req.Search,
		Status:    req.Status,
		StartDate: startDate,
		EndDate:   endDate,
		SortBy:    req.SortBy,
		SortDir:   req.SortDir,
		Limit:     perPage,
		Offset:    (page - 1) * perPage,
	}

	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	resp := make([]dto.JournalEntryResponse, 0, len(items))
	for i := range items {
		v := uc.mapper.ToSummaryResponse(&items[i])
		resp = append(resp, v)
	}
	return resp, total, nil
}

func (uc *journalEntryUsecase) Post(ctx context.Context, id string) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	entry, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	if entry.Status == financeModels.JournalStatusPosted {
		resp := uc.mapper.ToResponse(entry)
		return &resp, nil
	}

	var debitTotal float64
	var creditTotal float64
	for _, ln := range entry.Lines {
		debitTotal += ln.Debit
		creditTotal += ln.Credit
	}
	if math.Abs(debitTotal-creditTotal) > 0.000001 {
		return nil, ErrJournalUnbalanced
	}
	if err := ensureNotClosed(ctx, uc.db, entry.EntryDate); err != nil {
		return nil, err
	}

	now := time.Now()
	if err := uc.db.WithContext(ctx).Model(&financeModels.JournalEntry{}).
		Where("id = ? AND status = ?", id, financeModels.JournalStatusDraft).
		Updates(map[string]interface{}{
			"status":    financeModels.JournalStatusPosted,
			"posted_at": &now,
			"posted_by": &actorID,
		}).Error; err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id, true)
	if err != nil {
		return nil, err
	}
	resp := uc.mapper.ToResponse(full)
	return &resp, nil
}

func (uc *journalEntryUsecase) TrialBalance(ctx context.Context, startDate, endDate *time.Time) (*dto.TrialBalanceResponse, error) {
	type aggRow struct {
		ChartOfAccountID string
		DebitTotal       float64
		CreditTotal      float64
	}

	q := uc.db.WithContext(ctx).
		Table("journal_lines").
		Select("journal_lines.chart_of_account_id as chart_of_account_id, COALESCE(SUM(journal_lines.debit),0) as debit_total, COALESCE(SUM(journal_lines.credit),0) as credit_total").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_entries.status = ?", financeModels.JournalStatusPosted)

	if startDate != nil {
		q = q.Where("journal_entries.entry_date >= ?", *startDate)
	}
	if endDate != nil {
		q = q.Where("journal_entries.entry_date <= ?", *endDate)
	}
	q = q.Group("journal_lines.chart_of_account_id")

	var rows []aggRow
	if err := q.Scan(&rows).Error; err != nil {
		return nil, err
	}

	coas, err := uc.coaRepo.FindAll(ctx, false)
	if err != nil {
		return nil, err
	}
	agg := make(map[string]aggRow, len(rows))
	for _, r := range rows {
		agg[r.ChartOfAccountID] = r
	}

	out := make([]dto.TrialBalanceRow, 0, len(coas))
	for _, a := range coas {
		r, ok := agg[a.ID]
		if !ok {
			r = aggRow{ChartOfAccountID: a.ID}
		}
		out = append(out, dto.TrialBalanceRow{
			ChartOfAccountID: a.ID,
			Code:             a.Code,
			Name:             a.Name,
			Type:             a.Type,
			DebitTotal:       r.DebitTotal,
			CreditTotal:      r.CreditTotal,
			Balance:          r.DebitTotal - r.CreditTotal,
		})
	}

	resp := &dto.TrialBalanceResponse{StartDate: startDate, EndDate: endDate, Rows: out}
	return resp, nil
}
