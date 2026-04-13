package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"gorm.io/gorm"
)

// FeedbackFormRepository defines data access for feedback forms.
type FeedbackFormRepository interface {
	FindByID(ctx context.Context, id string) (*models.FeedbackForm, error)
	FindActiveByOutletID(ctx context.Context, outletID string) (*models.FeedbackForm, error)
	FindByOutletID(ctx context.Context, outletID string) ([]models.FeedbackForm, error)
	List(ctx context.Context, page, perPage int) ([]models.FeedbackForm, int64, error)
	Create(ctx context.Context, form *models.FeedbackForm) error
	Update(ctx context.Context, form *models.FeedbackForm) error
	DeactivateAllForOutlet(ctx context.Context, outletID string) error
	Delete(ctx context.Context, id string) error
}

type feedbackFormRepository struct{ db *gorm.DB }

// NewFeedbackFormRepository creates a new FeedbackFormRepository implementation.
func NewFeedbackFormRepository(db *gorm.DB) FeedbackFormRepository {
	return &feedbackFormRepository{db: db}
}

func (r *feedbackFormRepository) db_(ctx context.Context) *gorm.DB {
	return r.db.WithContext(ctx)
}

func (r *feedbackFormRepository) FindByID(ctx context.Context, id string) (*models.FeedbackForm, error) {
	var form models.FeedbackForm
	if err := r.db_(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&form).Error; err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *feedbackFormRepository) FindActiveByOutletID(ctx context.Context, outletID string) (*models.FeedbackForm, error) {
	var form models.FeedbackForm
	if err := r.db_(ctx).
		Where("outlet_id = ? AND is_active = true AND deleted_at IS NULL", outletID).
		Order("created_at DESC").
		First(&form).Error; err != nil {
		return nil, err
	}
	return &form, nil
}

func (r *feedbackFormRepository) FindByOutletID(ctx context.Context, outletID string) ([]models.FeedbackForm, error) {
	var forms []models.FeedbackForm
	if err := r.db_(ctx).
		Where("outlet_id = ? AND deleted_at IS NULL", outletID).
		Order("created_at DESC").
		Find(&forms).Error; err != nil {
		return nil, err
	}
	return forms, nil
}

func (r *feedbackFormRepository) List(ctx context.Context, page, perPage int) ([]models.FeedbackForm, int64, error) {
	var forms []models.FeedbackForm
	var total int64
	offset := (page - 1) * perPage

	q := r.db_(ctx).Model(&models.FeedbackForm{}).Where("deleted_at IS NULL")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := q.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&forms).Error; err != nil {
		return nil, 0, err
	}
	return forms, total, nil
}

func (r *feedbackFormRepository) Create(ctx context.Context, form *models.FeedbackForm) error {
	return r.db_(ctx).Create(form).Error
}

func (r *feedbackFormRepository) Update(ctx context.Context, form *models.FeedbackForm) error {
	return r.db_(ctx).Save(form).Error
}

func (r *feedbackFormRepository) DeactivateAllForOutlet(ctx context.Context, outletID string) error {
	return r.db_(ctx).Model(&models.FeedbackForm{}).
		Where("outlet_id = ? AND deleted_at IS NULL", outletID).
		Update("is_active", false).Error
}

func (r *feedbackFormRepository) Delete(ctx context.Context, id string) error {
	return r.db_(ctx).Where("id = ?", id).Delete(&models.FeedbackForm{}).Error
}
