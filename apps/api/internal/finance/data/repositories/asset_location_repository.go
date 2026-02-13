package repositories

import (
	"context"
	"strings"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type AssetLocationListParams struct {
	Search  string
	Limit   int
	Offset  int
	SortBy  string
	SortDir string
}

type AssetLocationRepository interface {
	FindByID(ctx context.Context, id string) (*financeModels.AssetLocation, error)
	List(ctx context.Context, params AssetLocationListParams) ([]financeModels.AssetLocation, int64, error)
}

type assetLocationRepository struct {
	db *gorm.DB
}

func NewAssetLocationRepository(db *gorm.DB) AssetLocationRepository {
	return &assetLocationRepository{db: db}
}

func (r *assetLocationRepository) FindByID(ctx context.Context, id string) (*financeModels.AssetLocation, error) {
	var item financeModels.AssetLocation
	if err := r.db.WithContext(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var assetLocationAllowedSort = map[string]string{
	"created_at": "asset_locations.created_at",
	"updated_at": "asset_locations.updated_at",
	"name":       "asset_locations.name",
}

func (r *assetLocationRepository) List(ctx context.Context, params AssetLocationListParams) ([]financeModels.AssetLocation, int64, error) {
	var items []financeModels.AssetLocation
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.AssetLocation{})
	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("asset_locations.name ILIKE ? OR asset_locations.description ILIKE ?", like, like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := assetLocationAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = assetLocationAllowedSort["created_at"]
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
