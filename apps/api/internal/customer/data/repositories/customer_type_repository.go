package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/customer/data/models"
	"gorm.io/gorm"
)

// CustomerTypeRepository defines the interface for customer type data access
type CustomerTypeRepository interface {
	Create(ctx context.Context, customerType *models.CustomerType) error
	FindByID(ctx context.Context, id string) (*models.CustomerType, error)
	List(ctx context.Context, params ListParams) ([]models.CustomerType, int64, error)
	Update(ctx context.Context, customerType *models.CustomerType) error
	Delete(ctx context.Context, id string) error
}

type customerTypeRepository struct {
	db *gorm.DB
}

// NewCustomerTypeRepository creates a new CustomerTypeRepository
func NewCustomerTypeRepository(db *gorm.DB) CustomerTypeRepository {
	return &customerTypeRepository{db: db}
}

func (r *customerTypeRepository) Create(ctx context.Context, customerType *models.CustomerType) error {
	return r.db.WithContext(ctx).Create(customerType).Error
}

func (r *customerTypeRepository) FindByID(ctx context.Context, id string) (*models.CustomerType, error) {
	var customerType models.CustomerType
	err := r.db.WithContext(ctx).First(&customerType, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &customerType, nil
}

func (r *customerTypeRepository) List(ctx context.Context, params ListParams) ([]models.CustomerType, int64, error) {
	var customerTypes []models.CustomerType
	var total int64

	query := r.db.WithContext(ctx).Model(&models.CustomerType{})

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

	if err := query.Find(&customerTypes).Error; err != nil {
		return nil, 0, err
	}

	return customerTypes, total, nil
}

func (r *customerTypeRepository) Update(ctx context.Context, customerType *models.CustomerType) error {
	return r.db.WithContext(ctx).Save(customerType).Error
}

func (r *customerTypeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.CustomerType{}, "id = ?", id).Error
}
