package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type chartOfAccountRepository struct {
	db *gorm.DB
}

func NewChartOfAccountRepository(db *gorm.DB) ChartOfAccountRepository {
	return &chartOfAccountRepository{db: db}
}

type ChartOfAccountListParams struct {
	Search   string
	Type     *financeModels.AccountType
	ParentID *string
	IsActive *bool
	SortBy   string
	SortDir  string
	Limit    int
	Offset   int
}

type ChartOfAccountRepository interface {
	Create(ctx context.Context, item *financeModels.ChartOfAccount) error
	FindByID(ctx context.Context, id string) (*financeModels.ChartOfAccount, error)
	FindAll(ctx context.Context, onlyActive bool) ([]financeModels.ChartOfAccount, error)
	List(ctx context.Context, params ChartOfAccountListParams) ([]financeModels.ChartOfAccount, int64, error)
	Update(ctx context.Context, item *financeModels.ChartOfAccount) error
	Delete(ctx context.Context, id string) error
	ExistsByCode(ctx context.Context, code string, excludeID *string) (bool, error)
	FindByCode(ctx context.Context, code string) (*financeModels.ChartOfAccount, error)
	GetDB(ctx context.Context) *gorm.DB
}

func (r *chartOfAccountRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *chartOfAccountRepository) Create(ctx context.Context, item *financeModels.ChartOfAccount) error {
	return r.getDB(ctx).Create(item).Error
}

func (r *chartOfAccountRepository) FindByID(ctx context.Context, id string) (*financeModels.ChartOfAccount, error) {
	var item financeModels.ChartOfAccount
	if err := r.getDB(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *chartOfAccountRepository) FindAll(ctx context.Context, onlyActive bool) ([]financeModels.ChartOfAccount, error) {
	var items []financeModels.ChartOfAccount
	q := r.getDB(ctx).Model(&financeModels.ChartOfAccount{})
	if onlyActive {
		q = q.Where("is_active = ?", true)
	}
	if err := q.Order("code asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

var coaAllowedSort = map[string]string{
	"created_at": "chart_of_accounts.created_at",
	"updated_at": "chart_of_accounts.updated_at",
	"code":       "chart_of_accounts.code",
	"name":       "chart_of_accounts.name",
	"type":       "chart_of_accounts.type",
}

func (r *chartOfAccountRepository) List(ctx context.Context, params ChartOfAccountListParams) ([]financeModels.ChartOfAccount, int64, error) {
	var items []financeModels.ChartOfAccount
	var total int64

	q := r.getDB(ctx).Model(&financeModels.ChartOfAccount{})

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("chart_of_accounts.code ILIKE ? OR chart_of_accounts.name ILIKE ?", like, like)
	}
	if params.Type != nil {
		q = q.Where("chart_of_accounts.type = ?", *params.Type)
	}
	if params.ParentID != nil {
		q = q.Where("chart_of_accounts.parent_id = ?", *params.ParentID)
	}
	if params.IsActive != nil {
		q = q.Where("chart_of_accounts.is_active = ?", *params.IsActive)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := coaAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = coaAllowedSort["code"]
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

func (r *chartOfAccountRepository) Update(ctx context.Context, item *financeModels.ChartOfAccount) error {
	return r.getDB(ctx).Save(item).Error
}

func (r *chartOfAccountRepository) Delete(ctx context.Context, id string) error {
	return r.getDB(ctx).Delete(&financeModels.ChartOfAccount{}, "id = ?", id).Error
}

func (r *chartOfAccountRepository) ExistsByCode(ctx context.Context, code string, excludeID *string) (bool, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return false, nil
	}

	q := r.getDB(ctx).Model(&financeModels.ChartOfAccount{}).Where("code = ?", code)
	if excludeID != nil && strings.TrimSpace(*excludeID) != "" {
		q = q.Where("id <> ?", strings.TrimSpace(*excludeID))
	}
	var count int64
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *chartOfAccountRepository) FindByCode(ctx context.Context, code string) (*financeModels.ChartOfAccount, error) {
	var item financeModels.ChartOfAccount
	if err := r.getDB(ctx).Where("code = ?", code).First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *chartOfAccountRepository) GetDB(ctx context.Context) *gorm.DB {
	return r.getDB(ctx)
}
