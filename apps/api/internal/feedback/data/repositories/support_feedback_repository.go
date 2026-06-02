package repositories

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/storage"
	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"gorm.io/gorm"
)

type SupportFeedbackRepository interface {
	Create(ctx context.Context, feedback *models.SupportFeedback) error
	List(ctx context.Context, page, perPage int) ([]models.SupportFeedback, int64, error)
	Delete(ctx context.Context, id string) error
}

type supportFeedbackRepository struct {
	db *gorm.DB
}

func NewSupportFeedbackRepository(db *gorm.DB) SupportFeedbackRepository {
	return &supportFeedbackRepository{db: db}
}

func (r *supportFeedbackRepository) scopedQuery(ctx context.Context) *gorm.DB {
	db := r.db.Session(&gorm.Session{NewDB: true}).WithContext(ctx)
	if isSystemAdmin, _ := ctx.Value("is_system_admin").(bool); isSystemAdmin {
		return db.Table("support_feedbacks")
	}
	if tenantID, _ := ctx.Value("tenant_id").(string); tenantID != "" {
		return db.Table("support_feedbacks").Where("support_feedbacks.tenant_id = ?", tenantID)
	}
	return db.Table("support_feedbacks")
}

func (r *supportFeedbackRepository) Create(ctx context.Context, feedback *models.SupportFeedback) error {
	return database.GetDB(ctx, r.db).Create(feedback).Error
}

func (r *supportFeedbackRepository) List(ctx context.Context, page, perPage int) ([]models.SupportFeedback, int64, error) {
	var feedbacks []models.SupportFeedback
	var total int64

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	q := r.scopedQuery(ctx)

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := q.Order("support_feedbacks.created_at DESC").
		Offset(offset).Limit(perPage).
		Find(&feedbacks).Error; err != nil {
		return nil, 0, err
	}

	return feedbacks, total, nil
}

func (r *supportFeedbackRepository) Delete(ctx context.Context, id string) error {
	var feedback models.SupportFeedback
	err := r.scopedQuery(ctx).Where("id = ?", id).First(&feedback).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // Already deleted or doesn't exist
		}
		return err
	}

	// Delete from storage if image exists
	if feedback.ImageURL != nil && *feedback.ImageURL != "" {
		if key := storage.KeyFromURL(*feedback.ImageURL); key != "" {
			// Best effort deletion of storage file
			_ = storage.Delete(ctx, key)
		}
	}

	return r.scopedQuery(ctx).Where("id = ?", id).Delete(&models.SupportFeedback{}).Error
}
