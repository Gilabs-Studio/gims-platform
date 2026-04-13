package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"gorm.io/gorm"
)

// FeedbackResponseFilter holds query filter parameters for listing responses.
type FeedbackResponseFilter struct {
	OutletID  string
	FormID    string
	StartDate string // YYYY-MM-DD
	EndDate   string // YYYY-MM-DD
	Page      int
	PerPage   int
}

// FeedbackResponseRepository defines data access for submitted feedback.
type FeedbackResponseRepository interface {
	FindByID(ctx context.Context, id string) (*models.FeedbackResponse, error)
	Create(ctx context.Context, resp *models.FeedbackResponse) error
	List(ctx context.Context, filter FeedbackResponseFilter) ([]models.FeedbackResponse, int64, error)
	ExistsByTokenID(ctx context.Context, tokenID string) (bool, error)
}

type feedbackResponseRepository struct{ db *gorm.DB }

// NewFeedbackResponseRepository creates a new FeedbackResponseRepository implementation.
func NewFeedbackResponseRepository(db *gorm.DB) FeedbackResponseRepository {
	return &feedbackResponseRepository{db: db}
}

func (r *feedbackResponseRepository) FindByID(ctx context.Context, id string) (*models.FeedbackResponse, error) {
	var resp models.FeedbackResponse
	if err := r.db.WithContext(ctx).
		Preload("Form").
		Preload("Token").
		Where("id = ?", id).First(&resp).Error; err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *feedbackResponseRepository) Create(ctx context.Context, resp *models.FeedbackResponse) error {
	return r.db.WithContext(ctx).Create(resp).Error
}

func (r *feedbackResponseRepository) List(ctx context.Context, f FeedbackResponseFilter) ([]models.FeedbackResponse, int64, error) {
	var responses []models.FeedbackResponse
	var total int64

	if f.Page < 1 {
		f.Page = 1
	}
	if f.PerPage < 1 || f.PerPage > 100 {
		f.PerPage = 20
	}
	offset := (f.Page - 1) * f.PerPage

	q := r.db.WithContext(ctx).Model(&models.FeedbackResponse{})

	if f.OutletID != "" {
		q = q.Where("outlet_id = ?", f.OutletID)
	}
	if f.FormID != "" {
		q = q.Where("form_id = ?", f.FormID)
	}
	if f.StartDate != "" {
		q = q.Where("submitted_at >= ?", f.StartDate+" 00:00:00")
	}
	if f.EndDate != "" {
		q = q.Where("submitted_at <= ?", f.EndDate+" 23:59:59")
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := q.Preload("Form").
		Order("submitted_at DESC").
		Offset(offset).Limit(f.PerPage).
		Find(&responses).Error; err != nil {
		return nil, 0, err
	}
	return responses, total, nil
}

func (r *feedbackResponseRepository) ExistsByTokenID(ctx context.Context, tokenID string) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.FeedbackResponse{}).
		Where("token_id = ?", tokenID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}
