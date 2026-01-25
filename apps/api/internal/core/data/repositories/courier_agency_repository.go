package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"gorm.io/gorm"
)

// CourierAgencyRepository defines the interface for courier agency data access
type CourierAgencyRepository interface {
	Create(ctx context.Context, courierAgency *models.CourierAgency) error
	FindByID(ctx context.Context, id string) (*models.CourierAgency, error)
	List(ctx context.Context, params ListParams) ([]models.CourierAgency, int64, error)
	Update(ctx context.Context, courierAgency *models.CourierAgency) error
	Delete(ctx context.Context, id string) error
}

type courierAgencyRepository struct {
	db *gorm.DB
}

// NewCourierAgencyRepository creates a new instance of CourierAgencyRepository
func NewCourierAgencyRepository(db *gorm.DB) CourierAgencyRepository {
	return &courierAgencyRepository{db: db}
}

func (r *courierAgencyRepository) Create(ctx context.Context, courierAgency *models.CourierAgency) error {
	return r.db.WithContext(ctx).Create(courierAgency).Error
}

func (r *courierAgencyRepository) FindByID(ctx context.Context, id string) (*models.CourierAgency, error) {
	var courierAgency models.CourierAgency
	err := r.db.WithContext(ctx).First(&courierAgency, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &courierAgency, nil
}

func (r *courierAgencyRepository) List(ctx context.Context, params ListParams) ([]models.CourierAgency, int64, error) {
	var courierAgencies []models.CourierAgency
	var total int64

	query := r.db.WithContext(ctx).Model(&models.CourierAgency{})

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR description ILIKE ?", search, search, search)
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

	if err := query.Find(&courierAgencies).Error; err != nil {
		return nil, 0, err
	}

	return courierAgencies, total, nil
}

func (r *courierAgencyRepository) Update(ctx context.Context, courierAgency *models.CourierAgency) error {
	return r.db.WithContext(ctx).Save(courierAgency).Error
}

func (r *courierAgencyRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.CourierAgency{}, "id = ?", id).Error
}
