package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"gorm.io/gorm"
)

// FeedbackTokenRepository defines data access for one-time feedback tokens.
type FeedbackTokenRepository interface {
	FindByToken(ctx context.Context, token string) (*models.FeedbackToken, error)
	FindByID(ctx context.Context, id string) (*models.FeedbackToken, error)
	Create(ctx context.Context, t *models.FeedbackToken) error
	MarkUsed(ctx context.Context, id string, usedAt time.Time) error
}

type feedbackTokenRepository struct{ db *gorm.DB }

// NewFeedbackTokenRepository creates a new FeedbackTokenRepository implementation.
func NewFeedbackTokenRepository(db *gorm.DB) FeedbackTokenRepository {
	return &feedbackTokenRepository{db: db}
}

func (r *feedbackTokenRepository) FindByToken(ctx context.Context, token string) (*models.FeedbackToken, error) {
	var t models.FeedbackToken
	if err := r.db.WithContext(ctx).Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *feedbackTokenRepository) FindByID(ctx context.Context, id string) (*models.FeedbackToken, error) {
	var t models.FeedbackToken
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *feedbackTokenRepository) Create(ctx context.Context, t *models.FeedbackToken) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *feedbackTokenRepository) MarkUsed(ctx context.Context, id string, usedAt time.Time) error {
	return r.db.WithContext(ctx).Model(&models.FeedbackToken{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":  models.FeedbackTokenStatusUsed,
			"used_at": usedAt,
		}).Error
}
