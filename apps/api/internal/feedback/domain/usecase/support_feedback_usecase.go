package usecase

import (
	"context"
	"errors"
	"html"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/feedback/data/models"
	"github.com/gilabs/gims/api/internal/feedback/data/repositories"
	"github.com/gilabs/gims/api/internal/feedback/domain/dto"
	tenantRepos "github.com/gilabs/gims/api/internal/tenant/data/repositories"
	userRepos "github.com/gilabs/gims/api/internal/user/data/repositories"
	"github.com/google/uuid"
)

type SupportFeedbackUsecase interface {
	SubmitFeedback(ctx context.Context, userID, tenantID string, req *dto.SubmitSupportFeedbackRequest) (*dto.SupportFeedbackResponse, error)
	ListFeedbacks(ctx context.Context, page, perPage int) ([]dto.SupportFeedbackResponse, int64, error)
	DeleteFeedback(ctx context.Context, id string) error
}

type supportFeedbackUsecase struct {
	supportRepo repositories.SupportFeedbackRepository
	userRepo    userRepos.UserRepository
	tenantRepo  tenantRepos.TenantRepository
}

func NewSupportFeedbackUsecase(
	supportRepo repositories.SupportFeedbackRepository,
	userRepo userRepos.UserRepository,
	tenantRepo tenantRepos.TenantRepository,
) SupportFeedbackUsecase {
	return &supportFeedbackUsecase{
		supportRepo: supportRepo,
		userRepo:    userRepo,
		tenantRepo:  tenantRepo,
	}
}

func (u *supportFeedbackUsecase) SubmitFeedback(ctx context.Context, userID, tenantID string, req *dto.SubmitSupportFeedbackRequest) (*dto.SupportFeedbackResponse, error) {
	if userID == "" || tenantID == "" {
		return nil, errors.New("unauthorized: missing user or tenant credentials")
	}

	user, err := u.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	tenant, err := u.tenantRepo.FindByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	// Sanitize the message body against XSS/HTML injection.
	// Since the message is Markdown, html.EscapeString preserves markdown syntax
	// while neutralizing raw html tags (like <script>).
	sanitizedMessage := html.EscapeString(req.Message)

	feedback := &models.SupportFeedback{
		ID:         uuid.New().String(),
		TenantID:   tenantID,
		UserID:     userID,
		UserName:   user.Name,
		UserEmail:  user.Email,
		TenantName: tenant.Name,
		Message:    sanitizedMessage,
		ImageURL:   req.ImageURL,
		CreatedAt:  apptime.Now(),
		UpdatedAt:  apptime.Now(),
	}

	if err := u.supportRepo.Create(ctx, feedback); err != nil {
		return nil, err
	}

	return &dto.SupportFeedbackResponse{
		ID:         feedback.ID,
		TenantID:   feedback.TenantID,
		UserID:     feedback.UserID,
		UserName:   feedback.UserName,
		UserEmail:  feedback.UserEmail,
		TenantName: feedback.TenantName,
		Message:    feedback.Message,
		ImageURL:   feedback.ImageURL,
		CreatedAt:  feedback.CreatedAt,
	}, nil
}

func (u *supportFeedbackUsecase) ListFeedbacks(ctx context.Context, page, perPage int) ([]dto.SupportFeedbackResponse, int64, error) {
	feedbacks, total, err := u.supportRepo.List(ctx, page, perPage)
	if err != nil {
		return nil, 0, err
	}

	res := make([]dto.SupportFeedbackResponse, 0, len(feedbacks))
	for _, f := range feedbacks {
		res = append(res, dto.SupportFeedbackResponse{
			ID:         f.ID,
			TenantID:   f.TenantID,
			UserID:     f.UserID,
			UserName:   f.UserName,
			UserEmail:  f.UserEmail,
			TenantName: f.TenantName,
			Message:    f.Message,
			ImageURL:   f.ImageURL,
			CreatedAt:  f.CreatedAt,
		})
	}

	return res, total, nil
}

func (u *supportFeedbackUsecase) DeleteFeedback(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("invalid feedback id")
	}
	return u.supportRepo.Delete(ctx, id)
}
