package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"github.com/gilabs/gims/api/internal/crm/data/repositories"
	"github.com/gilabs/gims/api/internal/crm/domain/dto"
	"github.com/gilabs/gims/api/internal/crm/domain/mapper"
	"github.com/google/uuid"
)

// ActivityTypeUsecase defines the interface for activity type business logic
type ActivityTypeUsecase interface {
	Create(ctx context.Context, req dto.CreateActivityTypeRequest) (dto.ActivityTypeResponse, error)
	GetByID(ctx context.Context, id string) (dto.ActivityTypeResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.ActivityTypeResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateActivityTypeRequest) (dto.ActivityTypeResponse, error)
	Delete(ctx context.Context, id string) error
}

type activityTypeUsecase struct {
	repo repositories.ActivityTypeRepository
}

// NewActivityTypeUsecase creates a new activity type usecase
func NewActivityTypeUsecase(repo repositories.ActivityTypeRepository) ActivityTypeUsecase {
	return &activityTypeUsecase{repo: repo}
}

func (u *activityTypeUsecase) Create(ctx context.Context, req dto.CreateActivityTypeRequest) (dto.ActivityTypeResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	actType := &models.ActivityType{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Icon:        req.Icon,
		BadgeColor:  req.BadgeColor,
		Order:       req.Order,
		IsActive:    isActive,
	}

	if err := u.repo.Create(ctx, actType); err != nil {
		return dto.ActivityTypeResponse{}, err
	}

	return mapper.ToActivityTypeResponse(actType), nil
}

func (u *activityTypeUsecase) GetByID(ctx context.Context, id string) (dto.ActivityTypeResponse, error) {
	actType, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ActivityTypeResponse{}, err
	}
	return mapper.ToActivityTypeResponse(actType), nil
}

func (u *activityTypeUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.ActivityTypeResponse, int64, error) {
	actTypes, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToActivityTypeResponseList(actTypes), total, nil
}

func (u *activityTypeUsecase) Update(ctx context.Context, id string, req dto.UpdateActivityTypeRequest) (dto.ActivityTypeResponse, error) {
	actType, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ActivityTypeResponse{}, errors.New("activity type not found")
	}

	if req.Name != "" {
		actType.Name = req.Name
	}
	if req.Code != "" {
		actType.Code = req.Code
	}
	if req.Description != "" {
		actType.Description = req.Description
	}
	if req.Icon != "" {
		actType.Icon = req.Icon
	}
	if req.BadgeColor != "" {
		actType.BadgeColor = req.BadgeColor
	}
	if req.Order != nil {
		actType.Order = *req.Order
	}
	if req.IsActive != nil {
		actType.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, actType); err != nil {
		return dto.ActivityTypeResponse{}, err
	}

	return mapper.ToActivityTypeResponse(actType), nil
}

func (u *activityTypeUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("activity type not found")
	}
	return u.repo.Delete(ctx, id)
}
