package usecase

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

func formatFloatKey(v float64) string {
	return fmt.Sprintf("%.6f", v)
}

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
	PostOrUpdateJournal(ctx context.Context, req *dto.CreateJournalEntryRequest) (*dto.JournalEntryResponse, error)
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

// parseDate is kept as an alias for backward compatibility within this file.
func parseDate(value string) (time.Time, error) {
	return parseDateRequired(value)
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
	if math.Abs(math.Round(debitTotal*100)-math.Round(creditTotal*100)) > 0.1 {
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
	err = database.GetDB(ctx, uc.db).Transaction(func(tx *gorm.DB) error {
		if err := ensureNotClosed(ctx, tx, entryDate); err != nil {
			return err
		}
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

		entry := &financeModels.JournalEntry{
			EntryDate:         entryDate,
			Description:       strings.TrimSpace(req.Description),
			ReferenceType:     req.ReferenceType,
			ReferenceID:       req.ReferenceID,
			Status:            financeModels.JournalStatusDraft,
			CreatedBy:         &actorID,
			IsSystemGenerated: req.IsSystemGenerated,
			SourceDocumentURL: req.SourceDocumentURL,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}
		for _, ln := range req.Lines {
			memo := strings.TrimSpace(ln.Memo)
			coa := coaByID[ln.ChartOfAccountID]
			line := &financeModels.JournalLine{
				JournalEntryID:             entry.ID,
				ChartOfAccountID:           ln.ChartOfAccountID,
				ChartOfAccountCodeSnapshot: strings.TrimSpace(coa.Code),
				ChartOfAccountNameSnapshot: strings.TrimSpace(coa.Name),
				ChartOfAccountTypeSnapshot: string(coa.Type),
				Debit:                      ln.Debit,
				Credit:                     ln.Credit,
				Memo:                       memo,
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

		existingLineSnapshot := make(map[string]financeModels.JournalLine)
		for _, ln := range entry.Lines {
			key := strings.TrimSpace(ln.ChartOfAccountID) + "|" + strings.TrimSpace(ln.Memo) + "|" + formatFloatKey(ln.Debit) + "|" + formatFloatKey(ln.Credit)
			existingLineSnapshot[key] = ln
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

		coaByID := make(map[string]*financeModels.ChartOfAccount, len(req.Lines))
		for _, ln := range req.Lines {
			if _, ok := coaByID[ln.ChartOfAccountID]; ok {
				continue
			}
			coa, err := uc.coaRepo.FindByID(ctx, ln.ChartOfAccountID)
			if err != nil {
				return err
			}
			coaByID[ln.ChartOfAccountID] = coa
		}

		for _, ln := range req.Lines {
			memo := strings.TrimSpace(ln.Memo)
			key := strings.TrimSpace(ln.ChartOfAccountID) + "|" + memo + "|" + formatFloatKey(ln.Debit) + "|" + formatFloatKey(ln.Credit)
			if snap, ok := existingLineSnapshot[key]; ok && (snap.ChartOfAccountCodeSnapshot != "" || snap.ChartOfAccountNameSnapshot != "" || snap.ChartOfAccountTypeSnapshot != "") {
				line := &financeModels.JournalLine{
					JournalEntryID:             id,
					ChartOfAccountID:           ln.ChartOfAccountID,
					ChartOfAccountCodeSnapshot: snap.ChartOfAccountCodeSnapshot,
					ChartOfAccountNameSnapshot: snap.ChartOfAccountNameSnapshot,
					ChartOfAccountTypeSnapshot: snap.ChartOfAccountTypeSnapshot,
					Debit:                      ln.Debit,
					Credit:                     ln.Credit,
					Memo:                       memo,
				}
				if err := tx.Create(line).Error; err != nil {
					return err
				}
				continue
			}

			coa := coaByID[ln.ChartOfAccountID]
			line := &financeModels.JournalLine{
				JournalEntryID:             id,
				ChartOfAccountID:           ln.ChartOfAccountID,
				ChartOfAccountCodeSnapshot: strings.TrimSpace(coa.Code),
				ChartOfAccountNameSnapshot: strings.TrimSpace(coa.Name),
				ChartOfAccountTypeSnapshot: string(coa.Type),
				Debit:                      ln.Debit,
				Credit:                     ln.Credit,
				Memo:                       memo,
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
	page, perPage := normalizePagination(req.Page, req.PerPage)

	startDate, err := parseDateOptional(req.StartDate)
	if err != nil {
		return nil, 0, err
	}
	endDate, err := parseDateOptional(req.EndDate)
	if err != nil {
		return nil, 0, err
	}

	params := repositories.JournalEntryListParams{
		Search:        req.Search,
		Status:        req.Status,
		StartDate:     startDate,
		EndDate:       endDate,
		SortBy:        req.SortBy,
		SortDir:       req.SortDir,
		Limit:         perPage,
		Offset:        (page - 1) * perPage,
		ReferenceType: req.ReferenceType,
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

func (uc *journalEntryUsecase) PostOrUpdateJournal(ctx context.Context, req *dto.CreateJournalEntryRequest) (*dto.JournalEntryResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if req.ReferenceType == nil || req.ReferenceID == nil {
		return nil, errors.New("reference type and reference id are required for PostOrUpdateJournal")
	}

	var existing financeModels.JournalEntry
	err := uc.db.WithContext(ctx).
		Where("reference_type = ? AND reference_id = ?", req.ReferenceType, req.ReferenceID).
		First(&existing).Error

	if err == nil {
		if existing.Status == financeModels.JournalStatusPosted {
			return nil, ErrJournalPostedImmutable
		}

		updateReq := &dto.UpdateJournalEntryRequest{
			EntryDate:     req.EntryDate,
			Description:   req.Description,
			ReferenceType: req.ReferenceType,
			ReferenceID:   req.ReferenceID,
			Lines:         req.Lines,
		}

		updateres, err := uc.Update(ctx, existing.ID, updateReq)
		if err != nil {
			return nil, err
		}

		return uc.Post(ctx, updateres.ID)
	} else if err == gorm.ErrRecordNotFound {
		createres, err := uc.Create(ctx, req)
		if err != nil {
			return nil, err
		}
		return uc.Post(ctx, createres.ID)
	}

	return nil, err
}
