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

// ContactRoleUsecase defines the interface for contact role business logic
type ContactRoleUsecase interface {
	Create(ctx context.Context, req dto.CreateContactRoleRequest) (dto.ContactRoleResponse, error)
	GetByID(ctx context.Context, id string) (dto.ContactRoleResponse, error)
	List(ctx context.Context, params repositories.ListParams) ([]dto.ContactRoleResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateContactRoleRequest) (dto.ContactRoleResponse, error)
	Delete(ctx context.Context, id string) error
}

type contactRoleUsecase struct {
	repo repositories.ContactRoleRepository
}

// NewContactRoleUsecase creates a new contact role usecase
func NewContactRoleUsecase(repo repositories.ContactRoleRepository) ContactRoleUsecase {
	return &contactRoleUsecase{repo: repo}
}

func (u *contactRoleUsecase) Create(ctx context.Context, req dto.CreateContactRoleRequest) (dto.ContactRoleResponse, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	role := &models.ContactRole{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		BadgeColor:  req.BadgeColor,
		IsActive:    isActive,
	}

	if err := u.repo.Create(ctx, role); err != nil {
		return dto.ContactRoleResponse{}, err
	}

	return mapper.ToContactRoleResponse(role), nil
}

func (u *contactRoleUsecase) GetByID(ctx context.Context, id string) (dto.ContactRoleResponse, error) {
	role, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ContactRoleResponse{}, err
	}
	return mapper.ToContactRoleResponse(role), nil
}

func (u *contactRoleUsecase) List(ctx context.Context, params repositories.ListParams) ([]dto.ContactRoleResponse, int64, error) {
	roles, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, err
	}
	return mapper.ToContactRoleResponseList(roles), total, nil
}

func (u *contactRoleUsecase) Update(ctx context.Context, id string, req dto.UpdateContactRoleRequest) (dto.ContactRoleResponse, error) {
	role, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return dto.ContactRoleResponse{}, errors.New("contact role not found")
	}

	if req.Name != "" {
		role.Name = req.Name
	}
	if req.Code != "" {
		role.Code = req.Code
	}
	if req.Description != "" {
		role.Description = req.Description
	}
	if req.BadgeColor != "" {
		role.BadgeColor = req.BadgeColor
	}
	if req.IsActive != nil {
		role.IsActive = *req.IsActive
	}

	if err := u.repo.Update(ctx, role); err != nil {
		return dto.ContactRoleResponse{}, err
	}

	return mapper.ToContactRoleResponse(role), nil
}

func (u *contactRoleUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		return errors.New("contact role not found")
	}
	return u.repo.Delete(ctx, id)
}
