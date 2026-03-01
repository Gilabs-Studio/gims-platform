package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	"github.com/google/uuid"
)

// ActivityUsecase defines business logic for CRM activities
type ActivityUsecase interface {
	Create(ctx context.Context, req dto.CreateActivityRequest, employeeID string) (dto.ActivityResponse, error)
	GetByID(ctx context.Context, id string) (dto.ActivityResponse, error)
	List(ctx context.Context, params repositories.ActivityListParams) ([]dto.ActivityResponse, int64, error)
	Timeline(ctx context.Context, params repositories.ActivityListParams) ([]dto.ActivityResponse, int64, error)
}

type activityUsecase struct {
	activityRepo     repositories.ActivityRepository
	activityTypeRepo repositories.ActivityTypeRepository
}

// NewActivityUsecase creates a new activity usecase
func NewActivityUsecase(
	activityRepo repositories.ActivityRepository,
	activityTypeRepo repositories.ActivityTypeRepository,
) ActivityUsecase {
	return &activityUsecase{
		activityRepo:     activityRepo,
		activityTypeRepo: activityTypeRepo,
	}
}

func (u *activityUsecase) Create(ctx context.Context, req dto.CreateActivityRequest, employeeID string) (dto.ActivityResponse, error) {
	// Validate activity type if provided
	if req.ActivityTypeID != nil && *req.ActivityTypeID != "" {
		_, err := u.activityTypeRepo.FindByID(ctx, *req.ActivityTypeID)
		if err != nil {
			return dto.ActivityResponse{}, errors.New("activity type not found")
		}
	}

	// Parse timestamp or use current time
	timestamp := time.Now()
	if req.Timestamp != nil && *req.Timestamp != "" {
		t, err := time.Parse(time.RFC3339, *req.Timestamp)
		if err != nil {
			return dto.ActivityResponse{}, errors.New("invalid timestamp format, use ISO 8601")
		}
		timestamp = t
	}

	activity := &models.Activity{
		ID:             uuid.New().String(),
		Type:           req.Type,
		ActivityTypeID: req.ActivityTypeID,
		CustomerID:     req.CustomerID,
		ContactID:      req.ContactID,
		DealID:         req.DealID,
		LeadID:         req.LeadID,
		VisitReportID:  req.VisitReportID,
		EmployeeID:     employeeID,
		Description:    req.Description,
		Timestamp:      timestamp,
		Metadata:       req.Metadata,
	}

	if err := u.activityRepo.Create(ctx, activity); err != nil {
		return dto.ActivityResponse{}, fmt.Errorf("failed to create activity: %w", err)
	}

	// Reload with preloaded relations
	created, err := u.activityRepo.FindByID(ctx, activity.ID)
	if err != nil {
		return dto.ActivityResponse{}, err
	}
	return mapper.ToActivityResponse(created), nil
}

func (u *activityUsecase) GetByID(ctx context.Context, id string) (dto.ActivityResponse, error) {
	activity, err := u.activityRepo.FindByID(ctx, id)
	if err != nil {
		return dto.ActivityResponse{}, errors.New("activity not found")
	}
	return mapper.ToActivityResponse(activity), nil
}

func (u *activityUsecase) List(ctx context.Context, params repositories.ActivityListParams) ([]dto.ActivityResponse, int64, error) {
	activities, total, err := u.activityRepo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToActivityResponseList(activities), total, nil
}

func (u *activityUsecase) Timeline(ctx context.Context, params repositories.ActivityListParams) ([]dto.ActivityResponse, int64, error) {
	activities, total, err := u.activityRepo.Timeline(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToActivityResponseList(activities), total, nil
}
