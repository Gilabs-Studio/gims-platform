package repositories

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type AssetListParams struct {
	Search     string
	Status     *financeModels.AssetStatus
	CategoryID *string
	LocationID *string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
	Offset     int
	SortBy     string
	SortDir    string
}

type AssetRepository interface {
	FindByID(ctx context.Context, id string, withDetails bool) (*financeModels.Asset, error)
	List(ctx context.Context, params AssetListParams) ([]financeModels.Asset, int64, error)
	FindLastDepreciation(ctx context.Context, assetID string) (*financeModels.AssetDepreciation, error)
	GenerateCode(ctx context.Context) (string, error)
	UpdateStatus(ctx context.Context, assetID string, status financeModels.AssetStatus) error
}

type assetRepository struct {
	db *gorm.DB
}

func NewAssetRepository(db *gorm.DB) AssetRepository {
	return &assetRepository{db: db}
}

func (r *assetRepository) FindByID(ctx context.Context, id string, withDetails bool) (*financeModels.Asset, error) {
	var item financeModels.Asset
	q := r.db.WithContext(ctx)
	q = q.Preload("Category").Preload("Location")
	if withDetails {
		q = q.Preload("Depreciations", func(db *gorm.DB) *gorm.DB {
			return db.Order("depreciation_date asc")
		}).Preload("Transactions", func(db *gorm.DB) *gorm.DB {
			return db.Order("transaction_date asc")
		})
	}
	if err := q.First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var assetAllowedSort = map[string]string{
	"created_at":       "fixed_assets.created_at",
	"updated_at":       "fixed_assets.updated_at",
	"acquisition_date": "fixed_assets.acquisition_date",
	"code":             "fixed_assets.code",
	"name":             "fixed_assets.name",
	"book_value":       "fixed_assets.book_value",
}

func (r *assetRepository) List(ctx context.Context, params AssetListParams) ([]financeModels.Asset, int64, error) {
	var items []financeModels.Asset
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.Asset{}).
		Preload("Category").
		Preload("Location")
	q = security.ApplyScopeFilter(q, ctx, security.FinanceScopeQueryOptions())

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("fixed_assets.code ILIKE ? OR fixed_assets.name ILIKE ?", like, like)
	}
	if params.Status != nil {
		q = q.Where("fixed_assets.status = ?", *params.Status)
	}
	if params.CategoryID != nil && strings.TrimSpace(*params.CategoryID) != "" {
		q = q.Where("fixed_assets.category_id = ?", strings.TrimSpace(*params.CategoryID))
	}
	if params.LocationID != nil && strings.TrimSpace(*params.LocationID) != "" {
		q = q.Where("fixed_assets.location_id = ?", strings.TrimSpace(*params.LocationID))
	}
	if params.StartDate != nil {
		q = q.Where("fixed_assets.acquisition_date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("fixed_assets.acquisition_date <= ?", *params.EndDate)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := assetAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = assetAllowedSort["acquisition_date"]
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

func (r *assetRepository) FindLastDepreciation(ctx context.Context, assetID string) (*financeModels.AssetDepreciation, error) {
	var last financeModels.AssetDepreciation
	if err := r.db.WithContext(ctx).
		Where("asset_id = ?", assetID).
		Order("depreciation_date desc").
		First(&last).Error; err != nil {
		return nil, err
	}
	return &last, nil
}

func (r *assetRepository) GenerateCode(ctx context.Context) (string, error) {
	now := apptime.Now()
	prefix := "AST-" + now.Format("200601") + "-"

	var lastAsset financeModels.Asset
	err := r.db.WithContext(ctx).
		Unscoped().
		Where("code LIKE ?", prefix+"%").
		Order("code DESC").
		First(&lastAsset).Error

	nextNum := 1
	if err == nil {
		parts := strings.Split(lastAsset.Code, "-")
		if len(parts) == 3 {
			var lastNum int
			fmt.Sscanf(parts[2], "%d", &lastNum)
			nextNum = lastNum + 1
		}
	}

	return fmt.Sprintf("%s%04d", prefix, nextNum), nil
}

func (r *assetRepository) UpdateStatus(ctx context.Context, assetID string, status financeModels.AssetStatus) error {
	return r.db.WithContext(ctx).
		Model(&financeModels.Asset{}).
		Where("id = ?", assetID).
		Update("status", status).Error
}
