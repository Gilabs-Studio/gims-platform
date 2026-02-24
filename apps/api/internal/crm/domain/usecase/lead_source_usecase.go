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

// LeadSourceUsecase defines the interface for lead source business logic
type LeadSourceUsecase interface {
	Create(ctx context.Context, req dto.CreateLeadSourceRequest) (dto.LeadSourceResponse, error)
	GetByID(ctx context.Context, id string) (dto.LeadSourceResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.LeadSourceResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateLeadSourceRequest) (dto.LeadSourceResponse, error)
	Delete(ctx context.Context, id string) error
}

type leadSourceUsecase struct {
	repo repositories.LeadSourceRepository
}

// NewLeadSourceUsecase creates a new lead source usecase
func NewLeadSourceUsecase(repo repositories.LeadSourceRepository) LeadSourceUsecase {
	return &leadSourceUsecase{repo: repo}
}

func (u *leadSourceUsecase) Create(ctx context.Context, req dto.CreateLeadSourceRequest) (dto.LeadSourceResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	source := &models.LeadSource{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Order:       req.Order,
		IsActive:    isActive,
	}

	if err := u.repo.Create(ctx, source); err != nil {
		return dto.LeadSourceResponse{}, err
	}

	return mapper.ToLeadSourceResponse(source), nil
}

func (u *leadSourceUsecase) GetByID(ctx context.Context, id string) (dto.LeadSourceResponse, error) {
	source, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadSourceResponse{}, err
	}
	return mapper.ToLeadSourceResponse(source), nil
}

func (u *leadSourceUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.LeadSourceResponse, int64, error) {
	sources, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToLeadSourceResponseList(sources), total, nil
}

func (u *leadSourceUsecase) Update(ctx context.Context, id string, req dto.UpdateLeadSourceRequest) (dto.LeadSourceResponse, error) {
	source, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.LeadSourceResponse{}, errors.New("lead source not found")
	}

	if req.Name != "" {
		source.Name = req.Name
	}
	if req.Code != "" {
		source.Code = req.Code
	}
	if req.Description != "" {
		source.Description = req.Description
	}
	if req.Order != nil {
		source.Order = *req.Order
	}
	if req.IsActive != nil {
		source.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, source); err != nil {
		return dto.LeadSourceResponse{}, err
	}

	return mapper.ToLeadSourceResponse(source), nil
}

func (u *leadSourceUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("lead source not found")
	}
	return u.repo.Delete(ctx, id)
}
