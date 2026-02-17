package repositories

import (
	"context"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type BudgetListParams struct {
	Search    string
	Status    *financeModels.BudgetStatus
	StartDate *time.Time
	EndDate   *time.Time
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
}

type BudgetRepository interface {
	FindByID(ctx context.Context, id string, withItems bool) (*financeModels.Budget, error)
	List(ctx context.Context, params BudgetListParams) ([]financeModels.Budget, int64, error)
}

type budgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) BudgetRepository {
	return &budgetRepository{db: db}
}

func (r *budgetRepository) FindByID(ctx context.Context, id string, withItems bool) (*financeModels.Budget, error) {
	var item financeModels.Budget
	q := r.db.WithContext(ctx)
	if withItems {
		q = q.Preload("Items").Preload("Items.ChartOfAccount")
	}
	if err := q.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var budgetAllowedSort = map[string]string{
	"created_at":   "budgets.created_at",
	"updated_at":   "budgets.updated_at",
	"start_date":   "budgets.start_date",
	"end_date":     "budgets.end_date",
	"status":       "budgets.status",
	"total_amount": "budgets.total_amount",
}

func (r *budgetRepository) List(ctx context.Context, params BudgetListParams) ([]financeModels.Budget, int64, error) {
	var items []financeModels.Budget
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.Budget{})
	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("budgets.name ILIKE ? OR budgets.description ILIKE ?", like, like)
	}
	if params.Status != nil {
		q = q.Where("budgets.status = ?", *params.Status)
	}
	if params.StartDate != nil {
		q = q.Where("budgets.start_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("budgets.end_date <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := budgetAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = budgetAllowedSort["start_date"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
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
