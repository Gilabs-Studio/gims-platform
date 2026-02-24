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

// LeadStatusUsecase defines the interface for lead status business logic
type LeadStatusUsecase interface {
	Create(ctx context.Context, req dto.CreateLeadStatusRequest) (dto.LeadStatusResponse, error)
	GetByID(ctx context.Context, id string) (dto.LeadStatusResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.LeadStatusResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateLeadStatusRequest) (dto.LeadStatusResponse, error)
	Delete(ctx context.Context, id string) error
}

type leadStatusUsecase struct {
	repo repositories.LeadStatusRepository
}

// NewLeadStatusUsecase creates a new lead status usecase
func NewLeadStatusUsecase(repo repositories.LeadStatusRepository) LeadStatusUsecase {
	return &leadStatusUsecase{repo: repo}
}

func (u *leadStatusUsecase) Create(ctx context.Context, req dto.CreateLeadStatusRequest) (dto.LeadStatusResponse, error) {
	// Validate: only one default status allowed
	if req.IsDefault != nil && *req.IsDefault {
		existing, err := u.repo.FindDefault(ctx)
		if err == nil && existing != nil {
			return dto.LeadStatusResponse{}, errors.New("only one lead status can be marked as default")
		}
	}

	// Validate: only one converted status allowed
	if req.IsConverted != nil && *req.IsConverted {
		existing, err := u.repo.FindConverted(ctx)
		if err == nil && existing != nil {
			return dto.LeadStatusResponse{}, errors.New("only one lead status can be marked as converted")
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	isDefault := false
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}

	isConverted := false
	if req.IsConverted != nil {
		isConverted = *req.IsConverted
	}

	status := &models.LeadStatus{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Score:       req.Score,
		Color:       req.Color,
		Order:       req.Order,
		IsActive:    isActive,
		IsDefault:   isDefault,
		IsConverted: isConverted,
	}

	if err := u.repo.Create(ctx, status); err != nil {
		return dto.LeadStatusResponse{}, err
	}

	return mapper.ToLeadStatusResponse(status), nil
}

func (u *leadStatusUsecase) GetByID(ctx context.Context, id string) (dto.LeadStatusResponse, error) {
	status, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadStatusResponse{}, err
	}
	return mapper.ToLeadStatusResponse(status), nil
}

func (u *leadStatusUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.LeadStatusResponse, int64, error) {
	statuses, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToLeadStatusResponseList(statuses), total, nil
}

func (u *leadStatusUsecase) Update(ctx context.Context, id string, req dto.UpdateLeadStatusRequest) (dto.LeadStatusResponse, error) {
	status, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadStatusResponse{}, errors.New("lead status not found")
	}

	// Validate: only one default status allowed (excluding current)
	if req.IsDefault != nil && *req.IsDefault {
		existing, err := u.repo.FindDefault(ctx)
		if err == nil && existing != nil && existing.ID != id {
			return dto.LeadStatusResponse{}, errors.New("only one lead status can be marked as default")
		}
	}

	// Validate: only one converted status allowed (excluding current)
	if req.IsConverted != nil && *req.IsConverted {
		existing, err := u.repo.FindConverted(ctx)
		if err == nil && existing != nil && existing.ID != id {
			return dto.LeadStatusResponse{}, errors.New("only one lead status can be marked as converted")
		}
	}

	if req.Name != "" {
		status.Name = req.Name
	}
	if req.Code != "" {
		status.Code = req.Code
	}
	if req.Description != "" {
		status.Description = req.Description
	}
	if req.Score != nil {
		status.Score = *req.Score
	}
	if req.Color != "" {
		status.Color = req.Color
	}
	if req.Order != nil {
		status.Order = *req.Order
	}
	if req.IsActive != nil {
		status.IsActive = *req.IsActive
	}
	if req.IsDefault != nil {
		status.IsDefault = *req.IsDefault
	}
	if req.IsConverted != nil {
		status.IsConverted = *req.IsConverted
	}

	if err := u.repo.Update(ctx, status); err != nil {
		return dto.LeadStatusResponse{}, err
	}

	return mapper.ToLeadStatusResponse(status), nil
}

func (u *leadStatusUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("lead status not found")
	}
	return u.repo.Delete(ctx, id)
}
