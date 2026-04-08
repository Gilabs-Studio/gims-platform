package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/core/apptime"
	orgRepo "github.com/gilabs/gims/api/internal/organization/data/repositories"
	orgDTO "github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/data/models"
	"github.com/gilabs/gims/api/internal/pos/data/repositories"
	"github.com/gilabs/gims/api/internal/pos/domain/dto"
	"github.com/gilabs/gims/api/internal/pos/domain/mapper"
)

var (
	ErrFloorPlanNotFound       = errors.New("floor plan not found")
	ErrFloorPlanForbidden      = errors.New("forbidden: you do not have access to this floor plan")
	ErrFloorPlanAlreadyPublished = errors.New("floor plan is already in published state")
	ErrVersionNotFound         = errors.New("layout version not found")
)

// FloorPlanUsecase defines business operations
type FloorPlanUsecase interface {
	Create(ctx context.Context, req *dto.CreateFloorPlanRequest, userID string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error)
	GetByID(ctx context.Context, id string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error)
	List(ctx context.Context, params repositories.FloorPlanListParams, userCompanyID string, isOwner bool) ([]dto.FloorPlanResponse, int64, error)
	Update(ctx context.Context, id string, req *dto.UpdateFloorPlanRequest, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error)
	SaveLayoutData(ctx context.Context, id string, req *dto.SaveLayoutDataRequest, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error)
	Delete(ctx context.Context, id string, userCompanyID string, isOwner bool) error
	Publish(ctx context.Context, id string, userID string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error)
	ListVersions(ctx context.Context, floorPlanID string, userCompanyID string, isOwner bool) ([]dto.LayoutVersionResponse, error)
	GetFormData(ctx context.Context, userCompanyID string, isOwner bool) (*dto.FloorPlanFormDataResponse, error)
}

type floorPlanUsecase struct {
	repo        repositories.FloorPlanRepository
	companyRepo orgRepo.CompanyRepository
}

// NewFloorPlanUsecase creates a new instance
func NewFloorPlanUsecase(repo repositories.FloorPlanRepository, companyRepo orgRepo.CompanyRepository) FloorPlanUsecase {
	return &floorPlanUsecase{repo: repo, companyRepo: companyRepo}
}

func (u *floorPlanUsecase) Create(ctx context.Context, req *dto.CreateFloorPlanRequest, userID string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error) {
	// Non-owner can only create for their own company
	if !isOwner && req.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	plan := &models.FloorPlan{
		ID:          uuid.New().String(),
		CompanyID:   req.CompanyID,
		Name:        req.Name,
		FloorNumber: req.FloorNumber,
		Status:      models.FloorPlanStatusDraft,
		LayoutData:  "[]",
		CreatedBy:   &userID,
	}

	if req.GridSize != nil {
		plan.GridSize = *req.GridSize
	}
	if req.SnapToGrid != nil {
		plan.SnapToGrid = *req.SnapToGrid
	}
	if req.Width != nil {
		plan.Width = *req.Width
	}
	if req.Height != nil {
		plan.Height = *req.Height
	}

	if err := u.repo.Create(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to create floor plan: %w", err)
	}

	return mapper.ToFloorPlanResponse(plan), nil
}

func (u *floorPlanUsecase) GetByID(ctx context.Context, id string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error) {
	plan, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFloorPlanNotFound
		}
		return nil, fmt.Errorf("failed to get floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	return mapper.ToFloorPlanResponse(plan), nil
}

func (u *floorPlanUsecase) List(ctx context.Context, params repositories.FloorPlanListParams, userCompanyID string, isOwner bool) ([]dto.FloorPlanResponse, int64, error) {
	// Non-owner always scoped to their company
	if !isOwner {
		params.CompanyID = userCompanyID
	}

	plans, total, err := u.repo.List(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list floor plans: %w", err)
	}

	return mapper.ToFloorPlanListResponse(plans), total, nil
}

func (u *floorPlanUsecase) Update(ctx context.Context, id string, req *dto.UpdateFloorPlanRequest, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error) {
	plan, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFloorPlanNotFound
		}
		return nil, fmt.Errorf("failed to find floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	if req.Name != nil {
		plan.Name = *req.Name
	}
	if req.FloorNumber != nil {
		plan.FloorNumber = *req.FloorNumber
	}
	if req.GridSize != nil {
		plan.GridSize = *req.GridSize
	}
	if req.SnapToGrid != nil {
		plan.SnapToGrid = *req.SnapToGrid
	}
	if req.Width != nil {
		plan.Width = *req.Width
	}
	if req.Height != nil {
		plan.Height = *req.Height
	}

	if err := u.repo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to update floor plan: %w", err)
	}

	return mapper.ToFloorPlanResponse(plan), nil
}

func (u *floorPlanUsecase) SaveLayoutData(ctx context.Context, id string, req *dto.SaveLayoutDataRequest, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error) {
	plan, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFloorPlanNotFound
		}
		return nil, fmt.Errorf("failed to find floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	plan.LayoutData = string(req.LayoutData)
	// Reset published status on layout change
	plan.Status = models.FloorPlanStatusDraft

	if err := u.repo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to save layout data: %w", err)
	}

	return mapper.ToFloorPlanResponse(plan), nil
}

func (u *floorPlanUsecase) Delete(ctx context.Context, id string, userCompanyID string, isOwner bool) error {
	plan, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrFloorPlanNotFound
		}
		return fmt.Errorf("failed to find floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return ErrFloorPlanForbidden
	}

	if err := u.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete floor plan: %w", err)
	}

	return nil
}

func (u *floorPlanUsecase) Publish(ctx context.Context, id string, userID string, userCompanyID string, isOwner bool) (*dto.FloorPlanResponse, error) {
	plan, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFloorPlanNotFound
		}
		return nil, fmt.Errorf("failed to find floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	now := apptime.Now()
	plan.Version++
	plan.Status = models.FloorPlanStatusPublished
	plan.PublishedAt = &now
	plan.PublishedBy = &userID

	// Create immutable version snapshot
	version := &models.LayoutVersion{
		ID:          uuid.New().String(),
		FloorPlanID: plan.ID,
		Version:     plan.Version,
		LayoutData:  plan.LayoutData,
		PublishedAt: now,
		PublishedBy: userID,
	}

	if err := u.repo.CreateVersion(ctx, version); err != nil {
		return nil, fmt.Errorf("failed to create layout version: %w", err)
	}

	if err := u.repo.Update(ctx, plan); err != nil {
		return nil, fmt.Errorf("failed to publish floor plan: %w", err)
	}

	return mapper.ToFloorPlanResponse(plan), nil
}

func (u *floorPlanUsecase) ListVersions(ctx context.Context, floorPlanID string, userCompanyID string, isOwner bool) ([]dto.LayoutVersionResponse, error) {
	// Verify access to the floor plan
	plan, err := u.repo.FindByID(ctx, floorPlanID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFloorPlanNotFound
		}
		return nil, fmt.Errorf("failed to find floor plan: %w", err)
	}

	if !isOwner && plan.CompanyID != userCompanyID {
		return nil, ErrFloorPlanForbidden
	}

	versions, err := u.repo.ListVersions(ctx, floorPlanID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}

	return mapper.ToLayoutVersionListResponse(versions), nil
}

func (u *floorPlanUsecase) GetFormData(ctx context.Context, userCompanyID string, isOwner bool) (*dto.FloorPlanFormDataResponse, error) {
	var companies []dto.CompanyOption

	if isOwner {
		// Owner can see all active companies
		isActive := true
		allCompanies, _, err := u.companyRepo.List(ctx, &orgDTO.ListCompaniesRequest{
			IsActive: &isActive,
			PerPage:  100,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch companies: %w", err)
		}
		for _, c := range allCompanies {
			companyUUID, parseErr := uuid.Parse(c.ID)
			if parseErr != nil {
				continue
			}
			companies = append(companies, dto.CompanyOption{
				ID:   companyUUID,
				Name: c.Name,
			})
		}
	} else {
		// Manager sees only their own company
		company, err := u.companyRepo.FindByID(ctx, userCompanyID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &dto.FloorPlanFormDataResponse{Companies: []dto.CompanyOption{}}, nil
			}
			return nil, fmt.Errorf("failed to fetch company: %w", err)
		}
		companyUUID, parseErr := uuid.Parse(company.ID)
		if parseErr == nil {
			companies = []dto.CompanyOption{{ID: companyUUID, Name: company.Name}}
		}
	}

	if companies == nil {
		companies = []dto.CompanyOption{}
	}

	return &dto.FloorPlanFormDataResponse{Companies: companies}, nil
}
