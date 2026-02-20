package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrAreaNotFound              = errors.New("area not found")
	ErrAreaAlreadyExists         = errors.New("area with this name already exists")
	ErrAreaHasAssignedEmployees  = errors.New("cannot delete area with assigned employees")
	ErrInvalidEmployeeID         = errors.New("one or more employee IDs are invalid")
)

// AreaUsecase defines the interface for area business logic
type AreaUsecase interface {
	List(ctx context.Context, req *dto.ListAreasRequest) ([]dto.AreaResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.AreaResponse, error)
	GetByIDWithDetails(ctx context.Context, id string) (*dto.AreaDetailResponse, error)
	Create(ctx context.Context, req *dto.CreateAreaRequest) (*dto.AreaResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateAreaRequest) (*dto.AreaResponse, error)
	Delete(ctx context.Context, id string) error
	// AssignSupervisors assigns the specified employees as supervisors of the area.
	AssignSupervisors(ctx context.Context, areaID string, req *dto.AssignAreaSupervisorsRequest) (*dto.AreaDetailResponse, error)
	// AssignMembers assigns the specified employees as members of the area.
	AssignMembers(ctx context.Context, areaID string, req *dto.AssignAreaMembersRequest) (*dto.AreaDetailResponse, error)
	// RemoveEmployee removes an employee (supervisor or member) from the area.
	RemoveEmployee(ctx context.Context, areaID, employeeID string) (*dto.AreaDetailResponse, error)
}

type areaUsecase struct {
	areaRepo         repositories.AreaRepository
	employeeAreaRepo repositories.EmployeeAreaRepository
}

// NewAreaUsecase creates a new AreaUsecase
func NewAreaUsecase(
	areaRepo repositories.AreaRepository,
	employeeAreaRepo repositories.EmployeeAreaRepository,
) AreaUsecase {
	return &areaUsecase{
		areaRepo:         areaRepo,
		employeeAreaRepo: employeeAreaRepo,
	}
}

func (u *areaUsecase) List(ctx context.Context, req *dto.ListAreasRequest) ([]dto.AreaResponse, *utils.PaginationResult, error) {
	areas, total, err := u.areaRepo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := mapper.ToAreaResponses(areas)

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

func (u *areaUsecase) GetByID(ctx context.Context, id string) (*dto.AreaResponse, error) {
	area, err := u.areaRepo.FindByIDWithMembers(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	return mapper.ToAreaResponse(area), nil
}

func (u *areaUsecase) GetByIDWithDetails(ctx context.Context, id string) (*dto.AreaDetailResponse, error) {
	area, err := u.areaRepo.FindByIDWithMembers(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	return mapper.ToAreaDetailResponse(area), nil
}

func (u *areaUsecase) Create(ctx context.Context, req *dto.CreateAreaRequest) (*dto.AreaResponse, error) {
	existing, err := u.areaRepo.FindByName(ctx, req.Name)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAreaAlreadyExists
	}

	area := mapper.AreaFromCreateRequest(req)
	if err := u.areaRepo.Create(ctx, area); err != nil {
		return nil, err
	}

	return mapper.ToAreaResponse(area), nil
}

func (u *areaUsecase) Update(ctx context.Context, id string, req *dto.UpdateAreaRequest) (*dto.AreaResponse, error) {
	area, err := u.areaRepo.FindByIDWithMembers(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	if req.Name != "" && req.Name != area.Name {
		existing, err := u.areaRepo.FindByName(ctx, req.Name)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if existing != nil && existing.ID != id {
			return nil, ErrAreaAlreadyExists
		}
		area.Name = req.Name
	}

	if req.Description != "" {
		area.Description = req.Description
	}
	if req.IsActive != nil {
		area.IsActive = *req.IsActive
	}

	if err := u.areaRepo.Update(ctx, area); err != nil {
		return nil, err
	}

	// Reload with members for correct response
	updated, err := u.areaRepo.FindByIDWithMembers(ctx, id)
	if err != nil {
		return nil, err
	}

	return mapper.ToAreaResponse(updated), nil
}

func (u *areaUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.areaRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrAreaNotFound
		}
		return err
	}

	// Prevent deletion when employees are still assigned to the area.
	hasEmployees, err := u.areaRepo.HasAssignedEmployees(ctx, id)
	if err != nil {
		return err
	}
	if hasEmployees {
		return ErrAreaHasAssignedEmployees
	}

	return u.areaRepo.Delete(ctx, id)
}

func (u *areaUsecase) AssignSupervisors(ctx context.Context, areaID string, req *dto.AssignAreaSupervisorsRequest) (*dto.AreaDetailResponse, error) {
	if _, err := u.areaRepo.FindByID(ctx, areaID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	if err := u.employeeAreaRepo.AssignSupervisorsToArea(ctx, areaID, req.EmployeeIDs); err != nil {
		return nil, err
	}

	return u.GetByIDWithDetails(ctx, areaID)
}

func (u *areaUsecase) AssignMembers(ctx context.Context, areaID string, req *dto.AssignAreaMembersRequest) (*dto.AreaDetailResponse, error) {
	if _, err := u.areaRepo.FindByID(ctx, areaID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	if err := u.employeeAreaRepo.AssignMembersToArea(ctx, areaID, req.EmployeeIDs); err != nil {
		return nil, err
	}

	return u.GetByIDWithDetails(ctx, areaID)
}

func (u *areaUsecase) RemoveEmployee(ctx context.Context, areaID, employeeID string) (*dto.AreaDetailResponse, error) {
	if _, err := u.areaRepo.FindByID(ctx, areaID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrAreaNotFound
		}
		return nil, err
	}

	if err := u.employeeAreaRepo.RemoveFromArea(ctx, employeeID, areaID); err != nil {
		return nil, err
	}

	return u.GetByIDWithDetails(ctx, areaID)
}
