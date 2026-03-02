package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/gilabs/gims/api/internal/finance/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrFinancialClosingNotFound = errors.New("financial closing not found")
)

type FinancialClosingUsecase interface {
	Create(ctx context.Context, req *dto.CreateFinancialClosingRequest) (*dto.FinancialClosingResponse, error)
	Approve(ctx context.Context, id string) (*dto.FinancialClosingResponse, error)
	GetByID(ctx context.Context, id string) (*dto.FinancialClosingResponse, error)
	List(ctx context.Context, req *dto.ListFinancialClosingsRequest) ([]dto.FinancialClosingResponse, int64, error)
	GetAnalysis(ctx context.Context, id string) (*dto.FinancialClosingAnalysisResponse, error)
}

type financialClosingUsecase struct {
	db     *gorm.DB
	repo   repositories.FinancialClosingRepository
	mapper *mapper.FinancialClosingMapper
}

func NewFinancialClosingUsecase(db *gorm.DB, repo repositories.FinancialClosingRepository, mapper *mapper.FinancialClosingMapper) FinancialClosingUsecase {
	return &financialClosingUsecase{db: db, repo: repo, mapper: mapper}
}

func (uc *financialClosingUsecase) Create(ctx context.Context, req *dto.CreateFinancialClosingRequest) (*dto.FinancialClosingResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	periodEnd, err := time.Parse("2006-01-02", strings.TrimSpace(req.PeriodEndDate))
	if err != nil {
		return nil, errors.New("invalid period_end_date")
	}

	item := &financeModels.FinancialClosing{
		PeriodEndDate: periodEnd,
		Status:        financeModels.FinancialClosingStatusDraft,
		Notes:         strings.TrimSpace(req.Notes),
		CreatedBy:     &actorID,
	}
	if err := uc.db.WithContext(ctx).Create(item).Error; err != nil {
		return nil, err
	}

	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *financialClosingUsecase) Approve(ctx context.Context, id string) (*dto.FinancialClosingResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return nil, errors.New("user not authenticated")
	}

	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrFinancialClosingNotFound
		}
		return nil, err
	}
	if item.Status == financeModels.FinancialClosingStatusApproved {
		res := uc.mapper.ToResponse(item)
		return &res, nil
	}

	// disallow approving older/equal periods than latest approved
	latest, err := uc.repo.LatestApproved(ctx)
	if err == nil {
		if !item.PeriodEndDate.After(latest.PeriodEndDate) {
			return nil, errors.New("cannot approve closing period on/before latest approved period")
		}
	}

	now := apptime.Now()
	if err := uc.db.WithContext(ctx).Model(&financeModels.FinancialClosing{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":      financeModels.FinancialClosingStatusApproved,
		"approved_at": now,
		"approved_by": actorID,
	}).Error; err != nil {
		return nil, err
	}

	full, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	res := uc.mapper.ToResponse(full)
	return &res, nil
}

func (uc *financialClosingUsecase) GetByID(ctx context.Context, id string) (*dto.FinancialClosingResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, errors.New("id is required")
	}
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrFinancialClosingNotFound
		}
		return nil, err
	}
	res := uc.mapper.ToResponse(item)
	return &res, nil
}

func (uc *financialClosingUsecase) List(ctx context.Context, req *dto.ListFinancialClosingsRequest) ([]dto.FinancialClosingResponse, int64, error) {
	if req == nil {
		req = &dto.ListFinancialClosingsRequest{}
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

	items, total, err := uc.repo.List(ctx, repositories.FinancialClosingListParams{
		SortBy:  req.SortBy,
		SortDir: req.SortDir,
		Limit:   perPage,
		Offset:  (page - 1) * perPage,
	})
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.FinancialClosingResponse, 0, len(items))
	for i := range items {
		mapped := uc.mapper.ToResponse(&items[i])
		res = append(res, mapped)
	}
	return res, total, nil
}

func (uc *financialClosingUsecase) GetAnalysis(ctx context.Context, id string) (*dto.FinancialClosingAnalysisResponse, error) {
	item, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Calculate Opening Balance (Start of Year)
	startOfYear := time.Date(item.PeriodEndDate.Year(), 1, 1, 0, 0, 0, 0, time.UTC)

	// Balances up to Period End Date
	closingBalances, err := uc.calculateBalances(ctx, nil, &item.PeriodEndDate)
	if err != nil {
		return nil, err
	}

	// Balances before Start of Year (to get Opening Balance)
	// Actually "Saldo Awal Tahun" as shown in UI usually means the balance at Jan 1st (including Jan 1st transactions maybe? No, usually before Jan 1st).
	// But in standard ERP, Saldo Awal Tahun is balance as of 01-01 00:00.
	openingDate := startOfYear.AddDate(0, 0, -1) // Balance as of Dec 31 previous year
	openingBalances, err := uc.calculateBalances(ctx, nil, &openingDate)
	if err != nil {
		return nil, err
	}

	coas := []struct {
		ID   string
		Code string
		Name string
	}{}
	if err := uc.db.WithContext(ctx).Table("chart_of_accounts").Select("id, code, name").Order("code ASC").Scan(&coas).Error; err != nil {
		return nil, err
	}

	rows := make([]dto.FinancialClosingAnalysisRow, 0, len(coas))
	for _, c := range coas {
		cb := closingBalances[c.ID]
		ob := openingBalances[c.ID]
		rows = append(rows, dto.FinancialClosingAnalysisRow{
			AccountID:      c.ID,
			AccountCode:    c.Code,
			AccountName:    c.Name,
			ClosingBalance: cb,
			OpeningBalance: ob,
			Difference:     cb - ob,
		})
	}

	return &dto.FinancialClosingAnalysisResponse{
		Closing: uc.mapper.ToResponse(item),
		Rows:    rows,
	}, nil
}

func (uc *financialClosingUsecase) calculateBalances(ctx context.Context, start, end *time.Time) (map[string]float64, error) {
	type aggRow struct {
		ChartOfAccountID string
		DebitTotal       float64
		CreditTotal      float64
	}

	q := uc.db.WithContext(ctx).
		Table("journal_lines").
		Select("journal_lines.chart_of_account_id as chart_of_account_id, COALESCE(SUM(journal_lines.debit),0) as debit_total, COALESCE(SUM(journal_lines.credit),0) as credit_total").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_entries.status = ?", "posted")

	if start != nil {
		q = q.Where("journal_entries.entry_date >= ?", *start)
	}
	if end != nil {
		q = q.Where("journal_entries.entry_date <= ?", *end)
	}
	q = q.Group("journal_lines.chart_of_account_id")

	var results []aggRow
	if err := q.Scan(&results).Error; err != nil {
		return nil, err
	}

	// We need to know the account type to determine if Balance is Debit - Credit or Credit - Debit.
	// For simplicity, let's just return Debit - Credit for now, or fetch types.
	// In the UI "Saldo Akhir Akun" is usually Absolute or type-aware.

	coas := []struct {
		ID   string
		Type string
	}{}
	if err := uc.db.WithContext(ctx).Table("chart_of_accounts").Select("id, type").Scan(&coas).Error; err != nil {
		return nil, err
	}
	coaTypes := make(map[string]string)
	for _, c := range coas {
		coaTypes[c.ID] = c.Type
	}

	balances := make(map[string]float64)
	for _, r := range results {
		actorType := strings.ToLower(coaTypes[r.ChartOfAccountID])
		balance := r.DebitTotal - r.CreditTotal
		if actorType == "liability" || actorType == "equity" || actorType == "revenue" {
			balance = r.CreditTotal - r.DebitTotal
		}
		balances[r.ChartOfAccountID] = balance
	}

	return balances, nil
}
