package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/product/data/models"
	"gorm.io/gorm"
)

// ProductTypeRepository defines the interface for product type data access
type ProductTypeRepository interface {
	Create(ctx context.Context, productType *models.ProductType) error
	FindByID(ctx context.Context, id string) (*models.ProductType, error)
	List(ctx context.Context, params ListParams) ([]models.ProductType, int64, error)
	Update(ctx context.Context, productType *models.ProductType) error
	Delete(ctx context.Context, id string) error
}

type productTypeRepository struct {
	db *gorm.DB
}

// NewProductTypeRepository creates a new instance of ProductTypeRepository
func NewProductTypeRepository(db *gorm.DB) ProductTypeRepository {
	return &productTypeRepository{db: db}
}

func (r *productTypeRepository) Create(ctx context.Context, productType *models.ProductType) error {
	return r.db.WithContext(ctx).Create(productType).Error
}

func (r *productTypeRepository) FindByID(ctx context.Context, id string) (*models.ProductType, error) {
	var productType models.ProductType
	err := r.db.WithContext(ctx).First(&productType, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &productType, nil
}

func (r *productTypeRepository) List(ctx context.Context, params ListParams) ([]models.ProductType, int64, error) {
	var productTypes []models.ProductType
	var total int64

	query := r.db.WithContext(ctx).Model(&models.ProductType{})

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

	if err := query.Find(&productTypes).Error; err != nil {
		return nil, 0, err
	}

	return productTypes, total, nil
}

func (r *productTypeRepository) Update(ctx context.Context, productType *models.ProductType) error {
	return r.db.WithContext(ctx).Save(productType).Error
}

func (r *productTypeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.ProductType{}, "id = ?", id).Error
}
