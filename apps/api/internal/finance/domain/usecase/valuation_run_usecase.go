package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"gorm.io/gorm"
)

// ---- Errors ----

var (
	ErrValuationConflict    = errors.New("a valuation run is already processing for this type and period")
	ErrValuationPeriod      = errors.New("invalid valuation period: start must be before or equal to end")
	ErrValuationTypeUnknown = errors.New("unknown valuation type")
)

// ---- Valuation Strategy Interface ----

// ValuationLine represents a single debit/credit pair produced by a valuation strategy.
type ValuationLine struct {
	AccountDebitID  string
	AccountCreditID string
	Amount          float64
	Memo            string
}

// ValuationResult is the output of a valuation strategy calculation.
type ValuationResult struct {
	Lines       []ValuationLine
	TotalDebit  float64
	TotalCredit float64
	Description string
}

// ValuationStrategy defines the interface for different valuation calculation engines.
type ValuationStrategy interface {
	Calculate(ctx context.Context, periodStart, periodEnd time.Time) (*ValuationResult, error)
}

// ---- Valuation Run Usecase ----

// ValuationRunUsecase encapsulates the valuation run lifecycle.
type ValuationRunUsecase interface {
	Run(ctx context.Context, req *dto.RunValuationRequest) (*dto.ValuationRunResponse, error)
	GetByID(ctx context.Context, id string) (*dto.ValuationRunResponse, error)
	List(ctx context.Context, req *dto.ListValuationRunsRequest) ([]dto.ValuationRunResponse, int64, *dto.ValuationKPIMeta, error)
}

type valuationRunUsecase struct {
	db         *gorm.DB
	repo       repositories.ValuationRunRepository
	coaRepo    repositories.ChartOfAccountRepository
	journalUC  JournalEntryUsecase
	strategies map[string]ValuationStrategy
}

// NewValuationRunUsecase creates a new valuation run usecase.
func NewValuationRunUsecase(
	db *gorm.DB,
	repo repositories.ValuationRunRepository,
	coaRepo repositories.ChartOfAccountRepository,
	journalUC JournalEntryUsecase,
) ValuationRunUsecase {
	uc := &valuationRunUsecase{
		db:         db,
		repo:       repo,
		coaRepo:    coaRepo,
		journalUC:  journalUC,
		strategies: make(map[string]ValuationStrategy),
	}

	// Register default strategies
	uc.strategies["inventory"] = &inventoryValuationStrategy{db: db, coaRepo: coaRepo}
	uc.strategies["currency"] = &currencyRevaluationStrategy{db: db, coaRepo: coaRepo}
	uc.strategies["depreciation"] = &depreciationStrategy{db: db, coaRepo: coaRepo}
	uc.strategies["cost"] = &costAdjustmentStrategy{db: db, coaRepo: coaRepo}

	return uc
}

// Run executes the full valuation lifecycle.
func (uc *valuationRunUsecase) Run(ctx context.Context, req *dto.RunValuationRequest) (*dto.ValuationRunResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	actorID, _ := ctx.Value("user_id").(string)
	actorID = strings.TrimSpace(actorID)

	// 1. Parse and validate dates
	periodStart, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		return nil, fmt.Errorf("invalid period_start: %w", err)
	}
	periodEnd, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		return nil, fmt.Errorf("invalid period_end: %w", err)
	}
	if periodStart.After(periodEnd) {
		return nil, ErrValuationPeriod
	}

	valType := strings.ToLower(strings.TrimSpace(req.ValuationType))
	strategy, ok := uc.strategies[valType]
	if !ok {
		return nil, ErrValuationTypeUnknown
	}

	// 2. Generate reference ID (idempotency key)
	refID := strings.TrimSpace(req.ReferenceID)
	if refID == "" {
		refID = fmt.Sprintf("VAL-RUN-%s-%s-%d",
			strings.ToUpper(valType),
			periodEnd.Format("20060102"),
			time.Now().Unix(),
		)
	}

	// 2b. Check idempotency: if reference_id already exists, return existing
	existing, err := uc.repo.FindByReferenceID(ctx, refID)
	if err == nil && existing != nil {
		log.Printf("valuation_run event=idempotent_hit reference_id=%s status=%s", refID, existing.Status)
		return uc.toResponse(existing), nil
	}

	// 3. Concurrency lock: only one processing run per type+period
	hasProcessing, err := uc.repo.HasProcessingRun(ctx, valType, periodStart, periodEnd)
	if err != nil {
		return nil, fmt.Errorf("failed to check concurrency lock: %w", err)
	}
	if hasProcessing {
		return nil, ErrValuationConflict
	}

	// 4. Create run record with status=processing
	run := &financeModels.ValuationRun{
		ReferenceID:   refID,
		ValuationType: financeModels.ValuationType(valType),
		PeriodStart:   periodStart,
		PeriodEnd:     periodEnd,
		Status:        financeModels.ValuationRunStatusProcessing,
		CreatedBy:     &actorID,
	}
	if err := uc.repo.Create(ctx, run); err != nil {
		return nil, fmt.Errorf("failed to create valuation run: %w", err)
	}

	log.Printf("valuation_run event=started run_id=%s reference_id=%s type=%s period=%s..%s actor=%s",
		run.ID, refID, valType, req.PeriodStart, req.PeriodEnd, actorID)

	// 5. Execute strategy
	result, err := strategy.Calculate(ctx, periodStart, periodEnd)
	if err != nil {
		errMsg := err.Error()
		run.Status = financeModels.ValuationRunStatusFailed
		run.ErrorMessage = &errMsg
		_ = uc.repo.Update(ctx, run)
		log.Printf("valuation_run event=failed run_id=%s error=%s", run.ID, errMsg)
		return nil, fmt.Errorf("valuation calculation failed: %w", err)
	}

	// 6. If no differences, mark as no_difference
	if len(result.Lines) == 0 || (result.TotalDebit == 0 && result.TotalCredit == 0) {
		now := apptime.Now()
		run.Status = financeModels.ValuationRunStatusNoDifference
		run.CompletedAt = &now
		_ = uc.repo.Update(ctx, run)
		log.Printf("valuation_run event=no_difference run_id=%s reference_id=%s", run.ID, refID)
		return uc.toResponse(run), nil
	}

	// 7. Build journal lines from valuation result
	journalLines := make([]dto.JournalLineRequest, 0, len(result.Lines)*2)
	for _, vl := range result.Lines {
		journalLines = append(journalLines,
			dto.JournalLineRequest{
				ChartOfAccountID: vl.AccountDebitID,
				Debit:            vl.Amount,
				Credit:           0,
				Memo:             vl.Memo,
			},
			dto.JournalLineRequest{
				ChartOfAccountID: vl.AccountCreditID,
				Debit:            0,
				Credit:           vl.Amount,
				Memo:             vl.Memo,
			},
		)
	}

	// Map valuation type → reference type
	refTypeMap := map[string]string{
		"inventory":    "INVENTORY_VALUATION",
		"currency":     "CURRENCY_REVALUATION",
		"depreciation": "DEPRECIATION_VALUATION",
		"cost":         "COST_ADJUSTMENT",
	}
	refType := refTypeMap[valType]

	journalReq := &dto.CreateJournalEntryRequest{
		EntryDate:         periodEnd.Format("2006-01-02"),
		Description:       result.Description,
		ReferenceType:     &refType,
		ReferenceID:       &refID,
		IsSystemGenerated: true,
		Lines:             journalLines,
	}

	// 8. Create & post journal
	journalResp, err := uc.journalUC.PostOrUpdateJournal(ctx, journalReq)
	if err != nil {
		errMsg := err.Error()
		run.Status = financeModels.ValuationRunStatusFailed
		run.ErrorMessage = &errMsg
		_ = uc.repo.Update(ctx, run)
		log.Printf("valuation_run event=journal_failed run_id=%s error=%s", run.ID, errMsg)
		return nil, fmt.Errorf("failed to create valuation journal: %w", err)
	}

	// 9. Update the journal entry with valuation metadata
	uc.db.WithContext(ctx).Model(&financeModels.JournalEntry{}).
		Where("id = ?", journalResp.ID).
		Updates(map[string]interface{}{
			"is_valuation":     true,
			"valuation_run_id": run.ID,
			"source":           string(financeModels.JournalSourceValuation),
		})

	// 10. Complete the run
	now := apptime.Now()
	run.Status = financeModels.ValuationRunStatusCompleted
	run.TotalDebit = result.TotalDebit
	run.TotalCredit = result.TotalCredit
	run.JournalEntryID = &journalResp.ID
	run.CompletedAt = &now
	if err := uc.repo.Update(ctx, run); err != nil {
		log.Printf("valuation_run event=update_failed run_id=%s error=%s", run.ID, err.Error())
	}

	log.Printf("valuation_run event=completed run_id=%s reference_id=%s total_debit=%.2f total_credit=%.2f journal_id=%s",
		run.ID, refID, result.TotalDebit, result.TotalCredit, journalResp.ID)

	return uc.toResponse(run), nil
}

func (uc *valuationRunUsecase) GetByID(ctx context.Context, id string) (*dto.ValuationRunResponse, error) {
	run, err := uc.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	resp := uc.toResponse(run)
	return resp, nil
}

func (uc *valuationRunUsecase) List(ctx context.Context, req *dto.ListValuationRunsRequest) ([]dto.ValuationRunResponse, int64, *dto.ValuationKPIMeta, error) {
	page := req.Page
	perPage := req.PerPage
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	var startDate, endDate *time.Time
	if req.StartDate != nil {
		t, _ := time.Parse("2006-01-02", *req.StartDate)
		startDate = &t
	}
	if req.EndDate != nil {
		t, _ := time.Parse("2006-01-02", *req.EndDate)
		endDate = &t
	}

	params := repositories.ValuationRunListParams{
		ValuationType: req.ValuationType,
		Status:        req.Status,
		StartDate:     startDate,
		EndDate:       endDate,
		SortBy:        req.SortBy,
		SortDir:       req.SortDir,
		Limit:         perPage,
		Offset:        (page - 1) * perPage,
	}

	items, total, err := uc.repo.List(ctx, params)
	if err != nil {
		return nil, 0, nil, err
	}

	responses := make([]dto.ValuationRunResponse, 0, len(items))
	for i := range items {
		responses = append(responses, *uc.toResponse(&items[i]))
	}

	// Build KPI meta
	kpi := &dto.ValuationKPIMeta{
		TotalEntries: total,
	}
	for _, item := range items {
		kpi.TotalDebitSum += item.TotalDebit
		kpi.TotalCreditSum += item.TotalCredit
		switch item.Status {
		case financeModels.ValuationRunStatusCompleted:
			kpi.CompletedRuns++
		case financeModels.ValuationRunStatusProcessing:
			kpi.ProcessingRuns++
		case financeModels.ValuationRunStatusFailed:
			kpi.FailedRuns++
		}
	}

	return responses, total, kpi, nil
}

func (uc *valuationRunUsecase) toResponse(run *financeModels.ValuationRun) *dto.ValuationRunResponse {
	resp := &dto.ValuationRunResponse{
		ID:             run.ID,
		ReferenceID:    run.ReferenceID,
		ValuationType:  string(run.ValuationType),
		PeriodStart:    run.PeriodStart.Format("2006-01-02"),
		PeriodEnd:      run.PeriodEnd.Format("2006-01-02"),
		Status:         string(run.Status),
		TotalDebit:     run.TotalDebit,
		TotalCredit:    run.TotalCredit,
		JournalEntryID: run.JournalEntryID,
		ErrorMessage:   run.ErrorMessage,
		CreatedBy:      run.CreatedBy,
		CreatedAt:      run.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      run.UpdatedAt.Format(time.RFC3339),
	}
	if run.CompletedAt != nil {
		s := run.CompletedAt.Format(time.RFC3339)
		resp.CompletedAt = &s
	}
	return resp
}

// ================================================================
// Valuation Strategies (skeleton implementations)
// In production, each strategy would query real data sources
// (inventory batches, currency rates, depreciation schedules).
// ================================================================

type inventoryValuationStrategy struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
}

func (s *inventoryValuationStrategy) Calculate(ctx context.Context, periodStart, periodEnd time.Time) (*ValuationResult, error) {
	// Skeleton: find first 2 COAs and produce a sample adjustment
	coas, err := s.coaRepo.FindAll(ctx, false)
	if err != nil || len(coas) < 2 {
		return &ValuationResult{
			Lines:       nil,
			TotalDebit:  0,
			TotalCredit: 0,
			Description: "Inventory Valuation - No accounts available",
		}, nil
	}

	// In real implementation:
	// 1. Query inventory_batches for products in period
	// 2. Calculate book_value vs real_value per product+warehouse
	// 3. Aggregate differences above threshold
	amount := 100.00 // Skeleton amount

	return &ValuationResult{
		Lines: []ValuationLine{
			{
				AccountDebitID:  coas[0].ID,
				AccountCreditID: coas[1].ID,
				Amount:          amount,
				Memo: fmt.Sprintf("Inventory valuation adjustment %s to %s",
					periodStart.Format("2006-01-02"), periodEnd.Format("2006-01-02")),
			},
		},
		TotalDebit:  amount,
		TotalCredit: amount,
		Description: fmt.Sprintf("Inventory Valuation Run — Period %s to %s",
			periodStart.Format("2006-01-02"), periodEnd.Format("2006-01-02")),
	}, nil
}

type currencyRevaluationStrategy struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
}

func (s *currencyRevaluationStrategy) Calculate(ctx context.Context, periodStart, periodEnd time.Time) (*ValuationResult, error) {
	// Skeleton: no differences for now
	return &ValuationResult{
		Lines:       nil,
		TotalDebit:  0,
		TotalCredit: 0,
		Description: "Currency Revaluation - No foreign currency exposure detected",
	}, nil
}

type depreciationStrategy struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
}

func (s *depreciationStrategy) Calculate(ctx context.Context, periodStart, periodEnd time.Time) (*ValuationResult, error) {
	// Skeleton: no depreciation entries for now
	return &ValuationResult{
		Lines:       nil,
		TotalDebit:  0,
		TotalCredit: 0,
		Description: "Depreciation Valuation - No depreciable assets found for period",
	}, nil
}

type costAdjustmentStrategy struct {
	db      *gorm.DB
	coaRepo repositories.ChartOfAccountRepository
}

func (s *costAdjustmentStrategy) Calculate(ctx context.Context, periodStart, periodEnd time.Time) (*ValuationResult, error) {
	// Skeleton: no cost adjustments for now
	return &ValuationResult{
		Lines:       nil,
		TotalDebit:  0,
		TotalCredit: 0,
		Description: "Cost Adjustment - No variance detected",
	}, nil
}
