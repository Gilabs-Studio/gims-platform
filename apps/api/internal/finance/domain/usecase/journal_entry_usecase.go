package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
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

func safeStringPtr(v *string) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(*v)
}

func journalTraceKey(referenceType, referenceID *string) string {
	rt := safeStringPtr(referenceType)
	rid := safeStringPtr(referenceID)
	if rt == "" && rid == "" {
		return "unknown"
	}
	return rt + ":" + rid
}

func logJournalEvent(event string, fields map[string]interface{}) {
	log.Printf("journal_observability event=%s fields=%+v", event, fields)
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
	Reverse(ctx context.Context, id string) (*dto.JournalEntryResponse, error)
	TrialBalance(ctx context.Context, startDate, endDate *time.Time) (*dto.TrialBalanceResponse, error)
	PostOrUpdateJournal(ctx context.Context, req *dto.CreateJournalEntryRequest) (*dto.JournalEntryResponse, error)
	GetFormData(ctx context.Context) (*dto.JournalEntryFormDataResponse, error)
	CreateAdjustmentJournal(ctx context.Context, req *dto.CreateAdjustmentJournalRequest) (*dto.JournalEntryResponse, error)
	UpdateAdjustmentJournal(ctx context.Context, id string, req *dto.UpdateJournalEntryRequest) (*dto.JournalEntryResponse, error)
	PostAdjustmentJournal(ctx context.Context, id string) (*dto.JournalEntryResponse, error)
	ReverseAdjustmentJournal(ctx context.Context, id string) (*dto.JournalEntryResponse, error)
	RunValuation(ctx context.Context) (*dto.JournalEntryResponse, error)
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

func journalReferenceTypesForDomain(domain *string) []string {
	if domain == nil {
		return nil
	}

	switch strings.ToLower(strings.TrimSpace(*domain)) {
	case "sales":
		return []string{"SALES_INVOICE", "SALES_INVOICE_DP"}
	case "purchase":
		return []string{"GOODS_RECEIPT", "SUPPLIER_INVOICE", "SUPPLIER_INVOICE_DP", "PURCHASE_PAYMENT"}
	case "inventory", "stock":
		return []string{"STOCK_OPNAME", "INVENTORY_ADJUSTMENT"}
	case "cash_bank":
		return []string{"CASH_BANK", "PAYMENT", "SALES_PAYMENT"}
	case "finance":
		return []string{"GENERAL", "NTP", "ASSET_TXN", "ASSET_DEP", "UP_COUNTRY", "year_end_closing", "reversal"}
	case "adjustment":
		return []string{"MANUAL_ADJUSTMENT", "ADJUSTMENT", "CORRECTION"}
	case "valuation":
		return []string{"INVENTORY_VALUATION", "CURRENCY_REVALUATION", "COST_ADJUSTMENT"}
	default:
		return nil
	}
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
	if entry.Status == financeModels.JournalStatusPosted || entry.Status == financeModels.JournalStatusReversed {
		return nil, ErrJournalPostedImmutable
	}
	if entry.IsSystemGenerated {
		return nil, errors.New("system-generated journal entries cannot be modified")
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
	if entry.Status == financeModels.JournalStatusPosted || entry.Status == financeModels.JournalStatusReversed {
		return ErrJournalPostedImmutable
	}
	if entry.IsSystemGenerated {
		return errors.New("system-generated journal entries cannot be deleted")
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
	if codes := batchResolveJournalReferenceCodes(ctx, uc.db, []financeModels.JournalEntry{*item}); len(codes) > 0 {
		if c, ok := codes[item.ID]; ok && strings.TrimSpace(c) != "" {
			cc := strings.TrimSpace(c)
			resp.ReferenceCode = &cc
		}
	}
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
		Search:         req.Search,
		Status:         req.Status,
		StartDate:      startDate,
		EndDate:        endDate,
		SortBy:         req.SortBy,
		SortDir:        req.SortDir,
		Limit:          perPage,
		Offset:         (page - 1) * perPage,
		ReferenceType:  req.ReferenceType,
		ReferenceTypes: journalReferenceTypesForDomain(req.Domain),
	}

	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}

	codes := batchResolveJournalReferenceCodes(ctx, uc.db, items)

	resp := make([]dto.JournalEntryResponse, 0, len(items))
	for i := range items {
		v := uc.mapper.ToSummaryResponse(&items[i])
		if c, ok := codes[items[i].ID]; ok && strings.TrimSpace(c) != "" {
			cc := strings.TrimSpace(c)
			v.ReferenceCode = &cc
		}
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

	now := apptime.Now()
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
		Where("journal_entries.status = ?", financeModels.JournalStatusPosted).
		Where("journal_entries.deleted_at IS NULL").
		Where("journal_lines.deleted_at IS NULL")

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

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	traceKey := journalTraceKey(req.ReferenceType, req.ReferenceID)
	logJournalEvent("post_or_update.start", map[string]interface{}{
		"trace_key":      traceKey,
		"reference_type": safeStringPtr(req.ReferenceType),
		"reference_id":   safeStringPtr(req.ReferenceID),
		"line_count":     len(req.Lines),
		"actor_id":       actorID,
	})

	var existing financeModels.JournalEntry
	err := uc.db.WithContext(ctx).
		Where("reference_type = ? AND reference_id = ?", req.ReferenceType, req.ReferenceID).
		First(&existing).Error

	if err == nil {
		logJournalEvent("post_or_update.found_existing", map[string]interface{}{
			"trace_key": traceKey,
			"entry_id":  existing.ID,
			"status":    existing.Status,
		})

		if existing.Status == financeModels.JournalStatusPosted {
			logJournalEvent("post_or_update.blocked_posted_immutable", map[string]interface{}{
				"trace_key": traceKey,
				"entry_id":  existing.ID,
			})
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
			logJournalEvent("post_or_update.update_failed", map[string]interface{}{
				"trace_key": traceKey,
				"entry_id":  existing.ID,
				"error":     err.Error(),
			})
			return nil, err
		}

		posted, err := uc.Post(ctx, updateres.ID)
		if err != nil {
			logJournalEvent("post_or_update.post_after_update_failed", map[string]interface{}{
				"trace_key": traceKey,
				"entry_id":  updateres.ID,
				"error":     err.Error(),
			})
			return nil, err
		}

		logJournalEvent("post_or_update.update_path_success", map[string]interface{}{
			"trace_key":      traceKey,
			"entry_id":       posted.ID,
			"final_status":   posted.Status,
			"reference_type": safeStringPtr(req.ReferenceType),
			"reference_id":   safeStringPtr(req.ReferenceID),
		})

		return posted, nil
	} else if err == gorm.ErrRecordNotFound {
		createres, err := uc.Create(ctx, req)
		if err != nil {
			logJournalEvent("post_or_update.create_failed", map[string]interface{}{
				"trace_key": traceKey,
				"error":     err.Error(),
			})
			return nil, err
		}

		posted, err := uc.Post(ctx, createres.ID)
		if err != nil {
			logJournalEvent("post_or_update.post_after_create_failed", map[string]interface{}{
				"trace_key": traceKey,
				"entry_id":  createres.ID,
				"error":     err.Error(),
			})
			return nil, err
		}

		logJournalEvent("post_or_update.create_path_success", map[string]interface{}{
			"trace_key":      traceKey,
			"entry_id":       posted.ID,
			"final_status":   posted.Status,
			"reference_type": safeStringPtr(req.ReferenceType),
			"reference_id":   safeStringPtr(req.ReferenceID),
		})

		return posted, nil
	}

	logJournalEvent("post_or_update.lookup_failed", map[string]interface{}{
		"trace_key": traceKey,
		"error":     err.Error(),
	})

	return nil, err
}

// Reverse creates a new reversing journal entry (swapped debit/credit) for a posted entry,
// then auto-posts the reversal. This is standard accounting practice for correcting errors.
func (uc *journalEntryUsecase) Reverse(ctx context.Context, id string) (*dto.JournalEntryResponse, error) {
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

	if entry.Status != financeModels.JournalStatusPosted {
		return nil, errors.New("only posted journal entries can be reversed")
	}

	var existingReversal financeModels.JournalReversal
	err = uc.db.WithContext(ctx).
		Where("original_journal_entry_id = ?", entry.ID).
		First(&existingReversal).Error
	if err == nil {
		return nil, errors.New("journal entry has already been reversed")
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Build reversed lines: swap debit and credit
	reversedLines := make([]dto.JournalLineRequest, 0, len(entry.Lines))
	for _, ln := range entry.Lines {
		reversedLines = append(reversedLines, dto.JournalLineRequest{
			ChartOfAccountID: ln.ChartOfAccountID,
			Debit:            ln.Credit,
			Credit:           ln.Debit,
			Memo:             "Reversal: " + ln.Memo,
		})
	}

	refType := "reversal"
	reversalReq := &dto.CreateJournalEntryRequest{
		EntryDate:         apptime.Now().Format("2006-01-02"),
		Description:       "Reversal of: " + entry.Description,
		ReferenceType:     &refType,
		ReferenceID:       &entry.ID,
		Lines:             reversedLines,
		IsSystemGenerated: true,
	}

	// Create the reversal journal entry
	reversal, err := uc.Create(ctx, reversalReq)
	if err != nil {
		return nil, fmt.Errorf("failed to create reversal entry: %w", err)
	}

	// Auto-post the reversal
	posted, err := uc.Post(ctx, reversal.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to post reversal entry: %w", err)
	}

	reversalMeta := &financeModels.JournalReversal{
		OriginalJournalEntryID: entry.ID,
		ReversalJournalEntryID: posted.ID,
		Reason:                 "manual reversal",
		CreatedBy:              &actorID,
	}
	if err := uc.db.WithContext(ctx).Create(reversalMeta).Error; err != nil {
		return nil, fmt.Errorf("failed to save reversal metadata: %w", err)
	}

	// Mark the original journal entry as 'reversed'
	if err := uc.db.WithContext(ctx).Model(&financeModels.JournalEntry{}).
		Where("id = ?", entry.ID).
		Update("status", financeModels.JournalStatusReversed).Error; err != nil {
		log.Printf("warning: failed to mark original entry %s as reversed: %v", entry.ID, err)
	}

	return posted, nil
}

// GetFormData returns dropdown options for journal entry forms (COA list).
func (uc *journalEntryUsecase) GetFormData(ctx context.Context) (*dto.JournalEntryFormDataResponse, error) {
	coas, err := uc.coaRepo.FindAll(ctx, true)
	if err != nil {
		return nil, err
	}

	coaOptions := make([]dto.COAFormOption, 0, len(coas))
	for _, coa := range coas {
		coaOptions = append(coaOptions, dto.COAFormOption{
			ID:   coa.ID,
			Code: coa.Code,
			Name: coa.Name,
			Type: string(coa.Type),
		})
	}

	return &dto.JournalEntryFormDataResponse{
		ChartOfAccounts: coaOptions,
	}, nil
}

// CreateAdjustmentJournal creates a manual correction journal entry.
// reference_type is always forced to "MANUAL_ADJUSTMENT" and is_system_generated = false.
// This enforces governance: only Finance-controlled manual adjustments can use this endpoint.
func (uc *journalEntryUsecase) CreateAdjustmentJournal(ctx context.Context, req *dto.CreateAdjustmentJournalRequest) (*dto.JournalEntryResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	refType := "MANUAL_ADJUSTMENT"
	baseReq := &dto.CreateJournalEntryRequest{
		EntryDate:         req.EntryDate,
		Description:       req.Description,
		ReferenceType:     &refType,
		ReferenceID:       nil,
		Lines:             req.Lines,
		IsSystemGenerated: false,
		SourceDocumentURL: req.SourceDocumentURL,
	}

	return uc.Create(ctx, baseReq)
}

// UpdateAdjustmentJournal updates a manual correction journal entry.
func (uc *journalEntryUsecase) UpdateAdjustmentJournal(ctx context.Context, id string, req *dto.UpdateJournalEntryRequest) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}

	entry, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	if entry.ReferenceType == nil || *entry.ReferenceType != "MANUAL_ADJUSTMENT" {
		return nil, errors.New("can only update manual adjustment journals")
	}

	refType := "MANUAL_ADJUSTMENT"
	req.ReferenceType = &refType
	req.ReferenceID = entry.ReferenceID

	return uc.Update(ctx, id, req)
}

// PostAdjustmentJournal posts a manual correction journal entry.
func (uc *journalEntryUsecase) PostAdjustmentJournal(ctx context.Context, id string) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	entry, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	if entry.ReferenceType == nil || *entry.ReferenceType != "MANUAL_ADJUSTMENT" {
		return nil, errors.New("can only post manual adjustment journals")
	}
	return uc.Post(ctx, id)
}

// ReverseAdjustmentJournal reverses a posted manual correction journal entry.
func (uc *journalEntryUsecase) ReverseAdjustmentJournal(ctx context.Context, id string) (*dto.JournalEntryResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	entry, err := uc.repo.FindByID(ctx, id, false)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrJournalNotFound
		}
		return nil, err
	}
	if entry.ReferenceType == nil || *entry.ReferenceType != "MANUAL_ADJUSTMENT" {
		return nil, errors.New("can only reverse manual adjustment journals")
	}
	return uc.Reverse(ctx, id)
}

// RunValuation implements a skeleton valuation process.
// In a real implementation, this would trigger actual calculations for FIFO/Average
// inventory values, currency rates, or cost adjustments and generate corresponding journals.
// For now, it generates a sample balanced "INVENTORY_VALUATION" journal entry.
func (uc *journalEntryUsecase) RunValuation(ctx context.Context) (*dto.JournalEntryResponse, error) {
	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	refType := "INVENTORY_VALUATION"
	// Use a timestamped reference ID to ensure uniqueness for multiple runs
	refID := fmt.Sprintf("VAL-RUN-%d", time.Now().Unix())

	// Skeleton dynamic logic: let's assume we adjusted inventory value by $100
	req := &dto.CreateJournalEntryRequest{
		EntryDate:         apptime.Now().Format("2006-01-02"),
		Description:       "Inventory Valuation Run - Automatic Adjustment",
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		IsSystemGenerated: true,
		Lines: []dto.JournalLineRequest{
			{
				ChartOfAccountID: "11040001", // Sample Inventory Asset Account ID (mock)
				Debit:            100.00,
				Credit:           0,
				Memo:             "Valuation adjustment - increase",
			},
			{
				ChartOfAccountID: "51010001", // Sample COGS/Valuation Expense Account ID (mock)
				Debit:            0,
				Credit:           100.00,
				Memo:             "Valuation adjustment - contra",
			},
		},
	}

	// In a real scenario, we would allow the creation even if COA IDs don't exist yet by pre-validating or using specific system accounts.
	// For this skeleton, we'll try to find any 2 COAs if the hardcoded ones fail, to ensure the "Run" at least produces something in a test/dev env.
	coas, _ := uc.coaRepo.FindAll(ctx, false)
	if len(coas) >= 2 {
		req.Lines[0].ChartOfAccountID = coas[0].ID
		req.Lines[1].ChartOfAccountID = coas[1].ID
	}

	// We use PostOrUpdateJournal to ensure idempotency and auto-post the result
	return uc.PostOrUpdateJournal(ctx, req)
}
