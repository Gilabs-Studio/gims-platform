package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/utils"
	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	"gorm.io/gorm"
)

var (
	ErrWorkScheduleNotFound      = errors.New("work schedule not found")
	ErrWorkScheduleAlreadyExists = errors.New("work schedule with this name already exists")
	ErrCannotDeleteDefaultSchedule = errors.New("cannot delete default work schedule")
)

// WorkScheduleUsecase defines the interface for work schedule business logic
type WorkScheduleUsecase interface {
	List(ctx context.Context, req *dto.ListWorkSchedulesRequest) ([]dto.WorkScheduleResponse, *utils.PaginationResult, error)
	GetByID(ctx context.Context, id string) (*dto.WorkScheduleResponse, error)
	GetByDivisionID(ctx context.Context, divisionID string) (*dto.WorkScheduleResponse, error)
	GetDefault(ctx context.Context) (*dto.WorkScheduleResponse, error)
	Create(ctx context.Context, req *dto.CreateWorkScheduleRequest) (*dto.WorkScheduleResponse, error)
	Update(ctx context.Context, id string, req *dto.UpdateWorkScheduleRequest) (*dto.WorkScheduleResponse, error)
	Delete(ctx context.Context, id string) error
	SetDefault(ctx context.Context, id string) error
}

type workScheduleUsecase struct {
	repo   repositories.WorkScheduleRepository
	mapper *mapper.WorkScheduleMapper
}

// NewWorkScheduleUsecase creates a new WorkScheduleUsecase
func NewWorkScheduleUsecase(repo repositories.WorkScheduleRepository) WorkScheduleUsecase {
	return &workScheduleUsecase{
		repo:   repo,
		mapper: mapper.NewWorkScheduleMapper(),
	}
}

func (u *workScheduleUsecase) List(ctx context.Context, req *dto.ListWorkSchedulesRequest) ([]dto.WorkScheduleResponse, *utils.PaginationResult, error) {
	schedules, total, err := u.repo.List(ctx, req)
	if err != nil {
		return nil, nil, err
	}

	responses := u.mapper.ToResponseList(schedules)

	// Calculate pagination
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

func (u *workScheduleUsecase) GetByID(ctx context.Context, id string) (*dto.WorkScheduleResponse, error) {
	ws, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkScheduleNotFound
		}
		return nil, err
	}
	return u.mapper.ToResponse(ws), nil
}

func (u *workScheduleUsecase) GetByDivisionID(ctx context.Context, divisionID string) (*dto.WorkScheduleResponse, error) {
	ws, err := u.repo.FindByDivisionID(ctx, divisionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Fall back to default schedule
			return u.GetDefault(ctx)
		}
		return nil, err
	}
	return u.mapper.ToResponse(ws), nil
}

func (u *workScheduleUsecase) GetDefault(ctx context.Context) (*dto.WorkScheduleResponse, error) {
	ws, err := u.repo.FindDefault(ctx)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkScheduleNotFound
		}
		return nil, err
	}
	return u.mapper.ToResponse(ws), nil
}

func (u *workScheduleUsecase) Create(ctx context.Context, req *dto.CreateWorkScheduleRequest) (*dto.WorkScheduleResponse, error) {
	ws := u.mapper.ToModel(req)

	// If this is marked as default, unset other defaults
	if ws.IsDefault {
		// This will be handled in a transaction if needed
	}

	if err := u.repo.Create(ctx, ws); err != nil {
		return nil, err
	}

	// If marked as default, set it as default (handles unsetting others)
	if ws.IsDefault {
		if err := u.repo.SetDefault(ctx, ws.ID); err != nil {
			return nil, err
		}
	}

	return u.mapper.ToResponse(ws), nil
}

func (u *workScheduleUsecase) Update(ctx context.Context, id string, req *dto.UpdateWorkScheduleRequest) (*dto.WorkScheduleResponse, error) {
	ws, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkScheduleNotFound
		}
		return nil, err
	}

	u.mapper.ApplyUpdate(ws, req)

	if err := u.repo.Update(ctx, ws); err != nil {
		return nil, err
	}

	// If marked as default, set it as default (handles unsetting others)
	if req.IsDefault != nil && *req.IsDefault {
		if err := u.repo.SetDefault(ctx, ws.ID); err != nil {
			return nil, err
		}
	}

	return u.mapper.ToResponse(ws), nil
}

func (u *workScheduleUsecase) Delete(ctx context.Context, id string) error {
	ws, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrWorkScheduleNotFound
		}
		return err
	}

	// Prevent deleting default schedule
	if ws.IsDefault {
		return ErrCannotDeleteDefaultSchedule
	}

	return u.repo.Delete(ctx, id)
}

func (u *workScheduleUsecase) SetDefault(ctx context.Context, id string) error {
	// Verify schedule exists
	_, err := u.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrWorkScheduleNotFound
		}
		return err
	}

	return u.repo.SetDefault(ctx, id)
}

// GetWorkScheduleForEmployee gets the appropriate work schedule for an employee
// This can be extended to check employee's division or other factors
func (u *workScheduleUsecase) GetWorkScheduleForEmployee(ctx context.Context, divisionID *string) (*models.WorkSchedule, error) {
	var ws *models.WorkSchedule
	var err error

	// Try division-specific schedule first
	if divisionID != nil && *divisionID != "" {
		ws, err = u.repo.FindByDivisionID(ctx, *divisionID)
		if err == nil {
			return ws, nil
		}
		// If not found, fall back to default
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	// Get default schedule
	ws, err = u.repo.FindDefault(ctx)
	if err != nil {
		return nil, err
	}

	return ws, nil
}
