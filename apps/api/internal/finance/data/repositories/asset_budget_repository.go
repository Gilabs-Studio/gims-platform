package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type AssetBudgetRepository interface {
	Create(ctx context.Context, budget *models.AssetBudget) error
	Update(ctx context.Context, budget *models.AssetBudget) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*models.AssetBudget, error)
	FindByCode(ctx context.Context, code string) (*models.AssetBudget, error)
	List(ctx context.Context, params AssetBudgetListParams) ([]models.AssetBudget, int64, error)
	GenerateCode(ctx context.Context) (string, error)
	UpdateCategoryUsage(ctx context.Context, categoryID string, usedDelta, committedDelta float64) error
}

type AssetBudgetListParams struct {
	FiscalYear *int
	Status     *string
	Search     string
	SortBy     string
	SortDir    string
	Limit      int
	Offset     int
}

type assetBudgetRepository struct {
	db *gorm.DB
}

func NewAssetBudgetRepository(db *gorm.DB) AssetBudgetRepository {
	return &assetBudgetRepository{db: db}
}

func (r *assetBudgetRepository) Create(ctx context.Context, budget *models.AssetBudget) error {
	return r.db.WithContext(ctx).Create(budget).Error
}

func (r *assetBudgetRepository) Update(ctx context.Context, budget *models.AssetBudget) error {
	return r.db.WithContext(ctx).Save(budget).Error
}

func (r *assetBudgetRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.AssetBudget{}, "id = ?", id).Error
}

func (r *assetBudgetRepository) FindByID(ctx context.Context, id string) (*models.AssetBudget, error) {
	var budget models.AssetBudget
	err := r.db.WithContext(ctx).
		Preload("Categories").
		First(&budget, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *assetBudgetRepository) FindByCode(ctx context.Context, code string) (*models.AssetBudget, error) {
	var budget models.AssetBudget
	err := r.db.WithContext(ctx).
		Preload("Categories").
		Where("budget_code = ?", code).
		First(&budget).Error
	if err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *assetBudgetRepository) List(ctx context.Context, params AssetBudgetListParams) ([]models.AssetBudget, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.AssetBudget{})

	if params.FiscalYear != nil {
		query = query.Where("fiscal_year = ?", *params.FiscalYear)
	}

	if params.Status != nil {
		query = query.Where("status = ?", *params.Status)
	}

	if strings.TrimSpace(params.Search) != "" {
		search := "%" + strings.TrimSpace(params.Search) + "%"
		query = query.Where("budget_code ILIKE ? OR budget_name ILIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortDir := strings.ToLower(params.SortDir)
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "desc"
	}
	orderClause := fmt.Sprintf("%s %s", sortBy, sortDir)

	limit := params.Limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	offset := params.Offset
	if offset < 0 {
		offset = 0
	}

	var budgets []models.AssetBudget
	err := query.
		Preload("Categories").
		Order(orderClause).
		Limit(limit).
		Offset(offset).
		Find(&budgets).Error

	if err != nil {
		return nil, 0, err
	}

	return budgets, total, nil
}

func (r *assetBudgetRepository) GenerateCode(ctx context.Context) (string, error) {
	var maxCode string
	err := r.db.WithContext(ctx).
		Model(&models.AssetBudget{}).
		Select("COALESCE(MAX(budget_code), 'BUD-0000')").
		Scan(&maxCode).Error
	if err != nil {
		return "", err
	}

	var num int
	fmt.Sscanf(maxCode, "BUD-%d", &num)
	num++
	return fmt.Sprintf("BUD-%04d", num), nil
}

func (r *assetBudgetRepository) UpdateCategoryUsage(ctx context.Context, categoryID string, usedDelta, committedDelta float64) error {
	return r.db.WithContext(ctx).
		Model(&models.AssetBudgetCategory{}).
		Where("id = ?", categoryID).
		Updates(map[string]interface{}{
			"used_amount":      gorm.Expr("used_amount + ?", usedDelta),
			"committed_amount": gorm.Expr("committed_amount + ?", committedDelta),
		}).Error
}
