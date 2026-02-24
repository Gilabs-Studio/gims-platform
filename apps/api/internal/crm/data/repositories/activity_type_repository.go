package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// ActivityTypeRepository defines the interface for activity type data access
type ActivityTypeRepository interface {
	Create(ctx context.Context, actType *models.ActivityType) error
	FindByID(ctx context.Context, id string) (*models.ActivityType, error)
	List(ctx context.Context, params ListParams) ([]models.ActivityType, int64, error)
	Update(ctx context.Context, actType *models.ActivityType) error
	Delete(ctx context.Context, id string) error
}

type activityTypeRepository struct {
	db *gorm.DB
}

// NewActivityTypeRepository creates a new activity type repository
func NewActivityTypeRepository(db *gorm.DB) ActivityTypeRepository {
	return &activityTypeRepository{db: db}
}

func (r *activityTypeRepository) Create(ctx context.Context, actType *models.ActivityType) error {
	return r.db.WithContext(ctx).Create(actType).Error
}

func (r *activityTypeRepository) FindByID(ctx context.Context, id string) (*models.ActivityType, error) {
	var actType models.ActivityType
	err := r.db.WithContext(ctx).First(&actType, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &actType, nil
}

func (r *activityTypeRepository) List(ctx context.Context, params ListParams) ([]models.ActivityType, int64, error) {
	var actTypes []models.ActivityType
	var total int64

	query := r.db.WithContext(ctx).Model(&models.ActivityType{})

	if params.Search != "" {
		search := params.Search + "%"
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
		query = query.Order("\"order\" ASC, name ASC")
	}

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&actTypes).Error; err != nil {
		return nil, 0, err
	}

	return actTypes, total, nil
}

func (r *activityTypeRepository) Update(ctx context.Context, actType *models.ActivityType) error {
	return r.db.WithContext(ctx).Save(actType).Error
}

func (r *activityTypeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.ActivityType{}, "id = ?", id).Error
}
