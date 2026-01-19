package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"gorm.io/gorm"
)

// ProcurementTypeRepository defines the interface for procurement type data access
type ProcurementTypeRepository interface {
	Create(ctx context.Context, procurementType *models.ProcurementType) error
	FindByID(ctx context.Context, id string) (*models.ProcurementType, error)
	List(ctx context.Context, params ListParams) ([]models.ProcurementType, int64, error)
	Update(ctx context.Context, procurementType *models.ProcurementType) error
	Delete(ctx context.Context, id string) error
}

type procurementTypeRepository struct {
	db *gorm.DB
}

// NewProcurementTypeRepository creates a new instance of ProcurementTypeRepository
func NewProcurementTypeRepository(db *gorm.DB) ProcurementTypeRepository {
	return &procurementTypeRepository{db: db}
}

func (r *procurementTypeRepository) Create(ctx context.Context, procurementType *models.ProcurementType) error {
	return r.db.WithContext(ctx).Create(procurementType).Error
}

func (r *procurementTypeRepository) FindByID(ctx context.Context, id string) (*models.ProcurementType, error) {
	var procurementType models.ProcurementType
	err := r.db.WithContext(ctx).First(&procurementType, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &procurementType, nil
}

func (r *procurementTypeRepository) List(ctx context.Context, params ListParams) ([]models.ProcurementType, int64, error) {
	var procurementTypes []models.ProcurementType
	var total int64

	query := r.db.WithContext(ctx).Model(&models.ProcurementType{})

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
		query = query.Order(order)
	} else {
		query = query.Order("name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&procurementTypes).Error; err != nil {
		return nil, 0, err
	}

	return procurementTypes, total, nil
}

func (r *procurementTypeRepository) Update(ctx context.Context, procurementType *models.ProcurementType) error {
	return r.db.WithContext(ctx).Save(procurementType).Error
}

func (r *procurementTypeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.ProcurementType{}, "id = ?", id).Error
}
