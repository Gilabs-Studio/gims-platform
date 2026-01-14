package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/crm-healthcare/api/internal/core/utils"
	"github.com/gilabs/crm-healthcare/api/internal/organization/data/repositories"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/dto"
	"github.com/gilabs/crm-healthcare/api/internal/organization/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrAreaSupervisorNotFound = errors.New("area supervisor not found")
	ErrInvalidAreaID          = errors.New("one or more area IDs are invalid")
)

// AreaSupervisorUsecase defines the interface for area supervisor business logic
type AreaSupervisorUsecase interface {
	List(ctx context.Context, req *dto.ListAreaSupervisorsRequest) ([]dto.AreaSupervisorResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.AreaSupervisorResponse, error)
	Create(ctx context.Context, req *dto.CreateAreaSupervisorRequest) (*dto.AreaSupervisorResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateAreaSupervisorRequest) (*dto.AreaSupervisorResponse, error)
	Delete(ctx context.Context, id string) error
	AssignAreas(ctx context.Context, supervisorID string, req *dto.AssignAreasRequest) (*dto.AreaSupervisorResponse, error)
}

type areaSupervisorUsecase struct {
	areaSupervisorRepo repositories.AreaSupervisorRepository
	areaRepo           repositories.AreaRepository
}

// NewAreaSupervisorUsecase creates a new AreaSupervisorUsecase
func NewAreaSupervisorUsecase(
	areaSupervisorRepo repositories.AreaSupervisorRepository,
	areaRepo repositories.AreaRepository,
) AreaSupervisorUsecase {
	return &areaSupervisorUsecase{
		areaSupervisorRepo: areaSupervisorRepo,
		areaRepo:           areaRepo,
	}
}

func (u *areaSupervisorUsecase) List(ctx context.Context, req *dto.ListAreaSupervisorsRequest) ([]dto.AreaSupervisorResponse, *utils.PaginationResult, error) {
	supervisors, total, err := u.areaSupervisorRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := mapper.ToAreaSupervisorResponses(supervisors)

	page := req.Page
	if page < 1 {
		page = 1
	}
	perPage := req.PerPage
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	pagination := &utils.PaginationResult{
		Page:       page,
		PerPage:    perPage,
		Total:      int(total),
		TotalPages: int((total + int64(perPage) - 1) / int64(perPage)),
	}

	return responses, pagination, nil
}

func (u *areaSupervisorUsecase) GetByID(ctx context.Context, id string) (*dto.AreaSupervisorResponse, error) {
	supervisor, err := u.areaSupervisorRepo.FindByIDWithAreas(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaSupervisorNotFound
		}
		return nil, err
	}

	return mapper.ToAreaSupervisorResponse(supervisor), nil
}

func (u *areaSupervisorUsecase) Create(ctx context.Context, req *dto.CreateAreaSupervisorRequest) (*dto.AreaSupervisorResponse, error) {
	// Validate area IDs if provided
	if len(req.AreaIDs) > 0 {
		areas, err := u.areaRepo.FindByIDs(ctx, req.AreaIDs)
		if err != nil {
			return nil, err
		}
		if len(areas) != len(req.AreaIDs) {
			return nil, ErrInvalidAreaID
		}
	}

	supervisor := mapper.AreaSupervisorFromCreateRequest(req)
	if err := u.areaSupervisorRepo.Create(ctx, supervisor); err != nil {
		return nil, err
	}

	// Assign areas if provided
	if len(req.AreaIDs) > 0 {
		if err := u.areaSupervisorRepo.AssignAreas(ctx, supervisor.ID, req.AreaIDs); err != nil {
			return nil, err
		}
	}

	// Reload with areas
	supervisor, err := u.areaSupervisorRepo.FindByIDWithAreas(ctx, supervisor.ID)
	if err != nil {
		return nil, err
	}

	return mapper.ToAreaSupervisorResponse(supervisor), nil
}

func (u *areaSupervisorUsecase) Update(ctx context.Context, id string, req *dto.UpdateAreaSupervisorRequest) (*dto.AreaSupervisorResponse, error) {
	supervisor, err := u.areaSupervisorRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaSupervisorNotFound
		}
		return nil, err
	}

	if req.Name != "" {
		supervisor.Name = req.Name
	}
	if req.Email != "" {
		supervisor.Email = req.Email
	}
	if req.Phone != "" {
		supervisor.Phone = req.Phone
	}
	if req.IsActive != nil {
		supervisor.IsActive = *req.IsActive
	}

	if err := u.areaSupervisorRepo.Update(ctx, supervisor); err != nil {
		return nil, err
	}

	// Update area assignments if provided
	if len(req.AreaIDs) > 0 {
		areas, err := u.areaRepo.FindByIDs(ctx, req.AreaIDs)
		if err != nil {
			return nil, err
		}
		if len(areas) != len(req.AreaIDs) {
			return nil, ErrInvalidAreaID
		}
		if err := u.areaSupervisorRepo.AssignAreas(ctx, id, req.AreaIDs); err != nil {
			return nil, err
		}
	}

	// Reload with areas
	supervisor, err = u.areaSupervisorRepo.FindByIDWithAreas(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.ToAreaSupervisorResponse(supervisor), nil
}

func (u *areaSupervisorUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.areaSupervisorRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAreaSupervisorNotFound
		}
		return err
	}

	return u.areaSupervisorRepo.Delete(ctx, id)
}

func (u *areaSupervisorUsecase) AssignAreas(ctx context.Context, supervisorID string, req *dto.AssignAreasRequest) (*dto.AreaSupervisorResponse, error) {
	_, err := u.areaSupervisorRepo.FindByID(ctx, supervisorID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaSupervisorNotFound
		}
		return nil, err
	}

	// Validate area IDs
	if len(req.AreaIDs) > 0 {
		areas, err := u.areaRepo.FindByIDs(ctx, req.AreaIDs)
		if err != nil {
			return nil, err
		}
		if len(areas) != len(req.AreaIDs) {
			return nil, ErrInvalidAreaID
		}
	}

	if err := u.areaSupervisorRepo.AssignAreas(ctx, supervisorID, req.AreaIDs); err != nil {
		return nil, err
	}

	// Reload with areas
	supervisor, err := u.areaSupervisorRepo.FindByIDWithAreas(ctx, supervisorID)
	if err != nil {
		return nil, err
	}

	return mapper.ToAreaSupervisorResponse(supervisor), nil
}
