package repositories

import (
	"context"
	"strings"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type AssetCategoryListParams struct {
	Search  string
	Limit   int
	Offset  int
	SortBy  string
	SortDir string
}

type AssetCategoryRepository interface {
	FindByID(ctx context.Context, id string) (*financeModels.AssetCategory, error)
	List(ctx context.Context, params AssetCategoryListParams) ([]financeModels.AssetCategory, int64, error)
}

type assetCategoryRepository struct {
	db *gorm.DB
}

func NewAssetCategoryRepository(db *gorm.DB) AssetCategoryRepository {
	return &assetCategoryRepository{db: db}
}

func (r *assetCategoryRepository) FindByID(ctx context.Context, id string) (*financeModels.AssetCategory, error) {
	var item financeModels.AssetCategory
	if err := r.db.WithContext(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var assetCategoryAllowedSort = map[string]string{
	"created_at": "asset_categories.created_at",
	"updated_at": "asset_categories.updated_at",
	"name":       "asset_categories.name",
}

func (r *assetCategoryRepository) List(ctx context.Context, params AssetCategoryListParams) ([]financeModels.AssetCategory, int64, error) {
	var items []financeModels.AssetCategory
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.AssetCategory{})
	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("asset_categories.name ILIKE ?", like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := assetCategoryAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = assetCategoryAllowedSort["created_at"]
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
