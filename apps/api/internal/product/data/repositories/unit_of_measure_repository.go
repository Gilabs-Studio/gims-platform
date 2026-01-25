package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/product/data/models"
	"gorm.io/gorm"
)

// UnitOfMeasureRepository defines the interface for unit of measure data access
type UnitOfMeasureRepository interface {
	Create(ctx context.Context, uom *models.UnitOfMeasure) error
	FindByID(ctx context.Context, id string) (*models.UnitOfMeasure, error)
	List(ctx context.Context, params ListParams) ([]models.UnitOfMeasure, int64, error)
	Update(ctx context.Context, uom *models.UnitOfMeasure) error
	Delete(ctx context.Context, id string) error
}

type unitOfMeasureRepository struct {
	db *gorm.DB
}

// NewUnitOfMeasureRepository creates a new instance of UnitOfMeasureRepository
func NewUnitOfMeasureRepository(db *gorm.DB) UnitOfMeasureRepository {
	return &unitOfMeasureRepository{db: db}
}

func (r *unitOfMeasureRepository) Create(ctx context.Context, uom *models.UnitOfMeasure) error {
	return r.db.WithContext(ctx).Create(uom).Error
}

func (r *unitOfMeasureRepository) FindByID(ctx context.Context, id string) (*models.UnitOfMeasure, error) {
	var uom models.UnitOfMeasure
	err := r.db.WithContext(ctx).First(&uom, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &uom, nil
}

func (r *unitOfMeasureRepository) List(ctx context.Context, params ListParams) ([]models.UnitOfMeasure, int64, error) {
	var uoms []models.UnitOfMeasure
	var total int64

	query := r.db.WithContext(ctx).Model(&models.UnitOfMeasure{})

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR symbol ILIKE ? OR description ILIKE ?", search, search, search)
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

	if err := query.Find(&uoms).Error; err != nil {
		return nil, 0, err
	}

	return uoms, total, nil
}

func (r *unitOfMeasureRepository) Update(ctx context.Context, uom *models.UnitOfMeasure) error {
	return r.db.WithContext(ctx).Save(uom).Error
}

func (r *unitOfMeasureRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.UnitOfMeasure{}, "id = ?", id).Error
}
