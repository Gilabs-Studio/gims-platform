package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"gorm.io/gorm"
)

// PackagingRepository defines the interface for packaging data access
type PackagingRepository interface {
	Create(ctx context.Context, packaging *models.Packaging) error
	FindByID(ctx context.Context, id string) (*models.Packaging, error)
	List(ctx context.Context, params ListParams) ([]models.Packaging, int64, error)
	Update(ctx context.Context, packaging *models.Packaging) error
	Delete(ctx context.Context, id string) error
}

type packagingRepository struct {
	db *gorm.DB
}

// NewPackagingRepository creates a new instance of PackagingRepository
func NewPackagingRepository(db *gorm.DB) PackagingRepository {
	return &packagingRepository{db: db}
}

func (r *packagingRepository) Create(ctx context.Context, packaging *models.Packaging) error {
	return r.db.WithContext(ctx).Create(packaging).Error
}

func (r *packagingRepository) FindByID(ctx context.Context, id string) (*models.Packaging, error) {
	var packaging models.Packaging
	err := r.db.WithContext(ctx).First(&packaging, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &packaging, nil
}

func (r *packagingRepository) List(ctx context.Context, params ListParams) ([]models.Packaging, int64, error) {
	var packagings []models.Packaging
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Packaging{})

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", search, search)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if params.SortBy != "" {
		order := params.SortBy
		if params.SortDir == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}
		query = query.Order("is_active DESC, " + order)
	} else {
		query = query.Order("is_active DESC, name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&packagings).Error; err != nil {
		return nil, 0, err
	}

	return packagings, total, nil
}

func (r *packagingRepository) Update(ctx context.Context, packaging *models.Packaging) error {
	return r.db.WithContext(ctx).Save(packaging).Error
}

func (r *packagingRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Packaging{}, "id = ?", id).Error
}
