package repositories

import (
	"context"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

// ValuationRunRepository handles persistence for valuation runs.
type ValuationRunRepository interface {
	Create(ctx context.Context, run *financeModels.ValuationRun) error
	FindByID(ctx context.Context, id string) (*financeModels.ValuationRun, error)
	FindByReferenceID(ctx context.Context, refID string) (*financeModels.ValuationRun, error)
	HasProcessingRun(ctx context.Context, valuationType string, periodStart, periodEnd time.Time) (bool, error)
	Update(ctx context.Context, run *financeModels.ValuationRun) error
	List(ctx context.Context, params ValuationRunListParams) ([]financeModels.ValuationRun, int64, error)
}

// ValuationRunListParams holds filters for listing valuation runs.
type ValuationRunListParams struct {
	ValuationType *string
	Status        *string
	StartDate     *time.Time
	EndDate       *time.Time
	SortBy        string
	SortDir       string
	Limit         int
	Offset        int
}

type valuationRunRepository struct {
	db *gorm.DB
}

// NewValuationRunRepository creates a new repository instance.
func NewValuationRunRepository(db *gorm.DB) ValuationRunRepository {
	return &valuationRunRepository{db: db}
}

func (r *valuationRunRepository) Create(ctx context.Context, run *financeModels.ValuationRun) error {
	return r.db.WithContext(ctx).Create(run).Error
}

func (r *valuationRunRepository) FindByID(ctx context.Context, id string) (*financeModels.ValuationRun, error) {
	var run financeModels.ValuationRun
	if err := r.db.WithContext(ctx).First(&run, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &run, nil
}

func (r *valuationRunRepository) FindByReferenceID(ctx context.Context, refID string) (*financeModels.ValuationRun, error) {
	var run financeModels.ValuationRun
	if err := r.db.WithContext(ctx).First(&run, "reference_id = ?", refID).Error; err != nil {
		return nil, err
	}
	return &run, nil
}

// HasProcessingRun checks if there is already a run in "processing" state
// for the given valuation type and overlapping period. This prevents concurrent runs.
func (r *valuationRunRepository) HasProcessingRun(ctx context.Context, valuationType string, periodStart, periodEnd time.Time) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&financeModels.ValuationRun{}).
		Where("valuation_type = ? AND status = ? AND period_start = ? AND period_end = ?",
			valuationType,
			financeModels.ValuationRunStatusProcessing,
			periodStart,
			periodEnd,
		).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *valuationRunRepository) Update(ctx context.Context, run *financeModels.ValuationRun) error {
	return r.db.WithContext(ctx).Save(run).Error
}

var valuationRunAllowedSort = map[string]string{
	"created_at":   "valuation_runs.created_at",
	"updated_at":   "valuation_runs.updated_at",
	"period_start": "valuation_runs.period_start",
	"status":       "valuation_runs.status",
}

func (r *valuationRunRepository) List(ctx context.Context, params ValuationRunListParams) ([]financeModels.ValuationRun, int64, error) {
	var items []financeModels.ValuationRun
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.ValuationRun{})

	if params.ValuationType != nil {
		q = q.Where("valuation_runs.valuation_type = ?", *params.ValuationType)
	}
	if params.Status != nil {
		q = q.Where("valuation_runs.status = ?", *params.Status)
	}
	if params.StartDate != nil {
		q = q.Where("valuation_runs.period_start >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("valuation_runs.period_end <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := valuationRunAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = "valuation_runs.created_at"
	}
	sortDir := "desc"
	if params.SortDir == "asc" {
		sortDir = "asc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
