package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/supplier/data/models"
	"gorm.io/gorm"
)

// SupplierTypeRepository defines the interface for supplier type data access
type SupplierTypeRepository interface {
	Create(ctx context.Context, supplierType *models.SupplierType) error
	FindByID(ctx context.Context, id string) (*models.SupplierType, error)
	List(ctx context.Context, params ListParams) ([]models.SupplierType, int64, error)
	Update(ctx context.Context, supplierType *models.SupplierType) error
	Delete(ctx context.Context, id string) error
}

type supplierTypeRepository struct {
	db *gorm.DB
}

// NewSupplierTypeRepository creates a new instance of SupplierTypeRepository
func NewSupplierTypeRepository(db *gorm.DB) SupplierTypeRepository {
	return &supplierTypeRepository{db: db}
}

func (r *supplierTypeRepository) Create(ctx context.Context, supplierType *models.SupplierType) error {
	return r.db.WithContext(ctx).Create(supplierType).Error
}

func (r *supplierTypeRepository) FindByID(ctx context.Context, id string) (*models.SupplierType, error) {
	var supplierType models.SupplierType
	err := r.db.WithContext(ctx).First(&supplierType, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &supplierType, nil
}

func (r *supplierTypeRepository) List(ctx context.Context, params ListParams) ([]models.SupplierType, int64, error) {
	var supplierTypes []models.SupplierType
	var total int64

	query := r.db.WithContext(ctx).Model(&models.SupplierType{})

	// Apply search filter
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", search, search)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
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

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&supplierTypes).Error; err != nil {
		return nil, 0, err
	}

	return supplierTypes, total, nil
}

func (r *supplierTypeRepository) Update(ctx context.Context, supplierType *models.SupplierType) error {
	return r.db.WithContext(ctx).Save(supplierType).Error
}

func (r *supplierTypeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.SupplierType{}, "id = ?", id).Error
}
