package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/mapper"
)

var (
	ErrEmployeeNotFound              = errors.New("employee not found")
	ErrEmployeeCodeExists            = errors.New("employee code already exists")
	ErrEmployeeInvalidApprovalAction = errors.New("invalid approval action")
	ErrCannotApproveNonPending       = errors.New("can only approve/reject pending employees")
	ErrReplacementNotFound           = errors.New("replacement employee not found")
)

// EmployeeUsecase defines the interface for employee business logic
type EmployeeUsecase interface {
	Create(ctx context.Context, req dto.CreateEmployeeRequest, createdBy string) (dto.EmployeeResponse, error)
	GetByID(ctx context.Context, id string) (dto.EmployeeResponse, error)
	List(ctx context.Context, params dto.EmployeeListParams) ([]dto.EmployeeListItemResponse, int64, error)
	Update(ctx context.Context, id string, req dto.UpdateEmployeeRequest) (dto.EmployeeResponse, error)
	Delete(ctx context.Context, id string) error
	SubmitForApproval(ctx context.Context, id string) (dto.EmployeeResponse, error)
	Approve(ctx context.Context, id string, req dto.ApproveEmployeeRequest, approvedBy string) (dto.EmployeeResponse, error)
	AssignAreas(ctx context.Context, id string, req dto.AssignEmployeeAreasRequest) (dto.EmployeeResponse, error)
}

type employeeUsecase struct {
	employeeRepo     repositories.EmployeeRepository
	employeeAreaRepo repositories.EmployeeAreaRepository
}

// NewEmployeeUsecase creates a new EmployeeUsecase instance
func NewEmployeeUsecase(
	employeeRepo repositories.EmployeeRepository,
	employeeAreaRepo repositories.EmployeeAreaRepository,
) EmployeeUsecase {
	return &employeeUsecase{
		employeeRepo:     employeeRepo,
		employeeAreaRepo: employeeAreaRepo,
	}
}

func (u *employeeUsecase) Create(ctx context.Context, req dto.CreateEmployeeRequest, createdBy string) (dto.EmployeeResponse, error) {
	// Check if employee code already exists
	existing, _ := u.employeeRepo.FindByCode(ctx, req.EmployeeCode)
	if existing != nil {
		return dto.EmployeeResponse{}, ErrEmployeeCodeExists
	}

	// Validate replacement employee if specified
	if req.ReplacementForID != nil && *req.ReplacementForID != "" {
		replacement, err := u.employeeRepo.FindByID(ctx, *req.ReplacementForID)
		if err != nil || replacement == nil {
			return dto.EmployeeResponse{}, ErrReplacementNotFound
		}
	}

	// Default values
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	contractStatus := models.ContractStatusPermanent
	if req.ContractStatus != "" {
		contractStatus = models.ContractStatus(req.ContractStatus)
	}

	ptkpStatus := models.PTKPTK0
	if req.PTKPStatus != "" {
		ptkpStatus = models.PTKPStatus(req.PTKPStatus)
	}

	totalLeaveQuota := 12
	if req.TotalLeaveQuota > 0 {
		totalLeaveQuota = req.TotalLeaveQuota
	}

	employee := &models.Employee{
		EmployeeCode:      req.EmployeeCode,
		Name:              req.Name,
		Email:             req.Email,
		Phone:             req.Phone,
		UserID:            req.UserID,
		DivisionID:        req.DivisionID,
		JobPositionID:     req.JobPositionID,
		CompanyID:         req.CompanyID,
		DateOfBirth:       req.DateOfBirth,
		PlaceOfBirth:      req.PlaceOfBirth,
		Gender:            models.Gender(req.Gender),
		Religion:          req.Religion,
		Address:           req.Address,
		VillageID:         req.VillageID,
		NIK:               req.NIK,
		NPWP:              req.NPWP,
		BPJS:              req.BPJS,
		ContractStatus:    contractStatus,
		ContractStartDate: req.ContractStartDate,
		ContractEndDate:   req.ContractEndDate,
		TotalLeaveQuota:   totalLeaveQuota,
		PTKPStatus:        ptkpStatus,
		IsDisability:      req.IsDisability,
		ReplacementForID:  req.ReplacementForID,
		Status:            models.EmployeeStatusDraft,
		IsApproved:        false,
		CreatedBy:         &createdBy,
		IsActive:          isActive,
	}

	if err := u.employeeRepo.Create(ctx, employee); err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Assign areas if provided
	if len(req.AreaIDs) > 0 {
		if err := u.employeeAreaRepo.AssignAreas(ctx, employee.ID, req.AreaIDs); err != nil {
			return dto.EmployeeResponse{}, err
		}
	}

	// Reload with preloaded data
	employee, err := u.employeeRepo.FindByID(ctx, employee.ID)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee), nil
}

func (u *employeeUsecase) GetByID(ctx context.Context, id string) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}
	return mapper.ToEmployeeResponse(employee), nil
}

func (u *employeeUsecase) List(ctx context.Context, params dto.EmployeeListParams) ([]dto.EmployeeListItemResponse, int64, error) {
	// Set defaults
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 {
		params.PerPage = 10
	}

	repoParams := repositories.EmployeeListParams{
		Page:          params.Page,
		PerPage:       params.PerPage,
		Search:        params.Search,
		DivisionID:    params.DivisionID,
		JobPositionID: params.JobPositionID,
		AreaID:        params.AreaID,
		CompanyID:     params.CompanyID,
		Status:        params.Status,
		IsActive:      params.IsActive,
		SortBy:        params.SortBy,
		SortDir:       params.SortDir,
	}

	employees, total, err := u.employeeRepo.List(ctx, repoParams)
	if err != nil {
		return nil, 0, err
	}

	return mapper.ToEmployeeListItemResponseList(employees), total, nil
}

func (u *employeeUsecase) Update(ctx context.Context, id string, req dto.UpdateEmployeeRequest) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Check employee code uniqueness if changed
	if req.EmployeeCode != nil && *req.EmployeeCode != employee.EmployeeCode {
		existing, _ := u.employeeRepo.FindByCode(ctx, *req.EmployeeCode)
		if existing != nil && existing.ID != id {
			return dto.EmployeeResponse{}, ErrEmployeeCodeExists
		}
		employee.EmployeeCode = *req.EmployeeCode
	}

	// Validate replacement employee if specified
	if req.ReplacementForID != nil && *req.ReplacementForID != "" {
		replacement, err := u.employeeRepo.FindByID(ctx, *req.ReplacementForID)
		if err != nil || replacement == nil {
			return dto.EmployeeResponse{}, ErrReplacementNotFound
		}
		employee.ReplacementForID = req.ReplacementForID
	} else if req.ReplacementForID != nil {
		employee.ReplacementForID = nil
	}

	// Update fields if provided
	if req.Name != nil {
		employee.Name = *req.Name
	}
	if req.Email != nil {
		employee.Email = *req.Email
	}
	if req.Phone != nil {
		employee.Phone = *req.Phone
	}
	if req.UserID != nil {
		employee.UserID = req.UserID
	}
	if req.DivisionID != nil {
		employee.DivisionID = req.DivisionID
	}
	if req.JobPositionID != nil {
		employee.JobPositionID = req.JobPositionID
	}
	if req.CompanyID != nil {
		employee.CompanyID = req.CompanyID
	}
	if req.DateOfBirth != nil {
		employee.DateOfBirth = req.DateOfBirth
	}
	if req.PlaceOfBirth != nil {
		employee.PlaceOfBirth = *req.PlaceOfBirth
	}
	if req.Gender != nil {
		employee.Gender = models.Gender(*req.Gender)
	}
	if req.Religion != nil {
		employee.Religion = *req.Religion
	}
	if req.Address != nil {
		employee.Address = *req.Address
	}
	if req.VillageID != nil {
		employee.VillageID = req.VillageID
	}
	if req.NIK != nil {
		employee.NIK = *req.NIK
	}
	if req.NPWP != nil {
		employee.NPWP = *req.NPWP
	}
	if req.BPJS != nil {
		employee.BPJS = *req.BPJS
	}
	if req.ContractStatus != nil {
		employee.ContractStatus = models.ContractStatus(*req.ContractStatus)
	}
	if req.ContractStartDate != nil {
		employee.ContractStartDate = req.ContractStartDate
	}
	if req.ContractEndDate != nil {
		employee.ContractEndDate = req.ContractEndDate
	}
	if req.TotalLeaveQuota != nil {
		employee.TotalLeaveQuota = *req.TotalLeaveQuota
	}
	if req.PTKPStatus != nil {
		employee.PTKPStatus = models.PTKPStatus(*req.PTKPStatus)
	}
	if req.IsDisability != nil {
		employee.IsDisability = *req.IsDisability
	}
	if req.IsActive != nil {
		employee.IsActive = *req.IsActive
	}

	if err := u.employeeRepo.Update(ctx, employee); err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Update area assignments if provided
	if req.AreaIDs != nil {
		if err := u.employeeAreaRepo.RemoveAllAreas(ctx, id); err != nil {
			return dto.EmployeeResponse{}, err
		}
		if len(req.AreaIDs) > 0 {
			if err := u.employeeAreaRepo.AssignAreas(ctx, id, req.AreaIDs); err != nil {
				return dto.EmployeeResponse{}, err
			}
		}
	}

	// Reload with preloaded data
	employee, err = u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee), nil
}

func (u *employeeUsecase) Delete(ctx context.Context, id string) error {
	_, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return ErrEmployeeNotFound
	}

	// Remove all area assignments first
	if err := u.employeeAreaRepo.RemoveAllAreas(ctx, id); err != nil {
		return err
	}

	return u.employeeRepo.Delete(ctx, id)
}

func (u *employeeUsecase) SubmitForApproval(ctx context.Context, id string) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	employee.Status = models.EmployeeStatusPending

	if err := u.employeeRepo.Update(ctx, employee); err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee), nil
}

func (u *employeeUsecase) Approve(ctx context.Context, id string, req dto.ApproveEmployeeRequest, approvedBy string) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	if employee.Status != models.EmployeeStatusPending {
		return dto.EmployeeResponse{}, ErrCannotApproveNonPending
	}

	now := time.Now()

	switch req.Action {
	case "approve":
		employee.Status = models.EmployeeStatusApproved
		employee.IsApproved = true
		employee.ApprovedBy = &approvedBy
		employee.ApprovedAt = &now
	case "reject":
		employee.Status = models.EmployeeStatusRejected
		employee.IsApproved = false
		employee.ApprovedBy = &approvedBy
		employee.ApprovedAt = &now
	default:
		return dto.EmployeeResponse{}, ErrEmployeeInvalidApprovalAction
	}

	if err := u.employeeRepo.Update(ctx, employee); err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee), nil
}

func (u *employeeUsecase) AssignAreas(ctx context.Context, id string, req dto.AssignEmployeeAreasRequest) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Replace all area assignments
	if err := u.employeeAreaRepo.RemoveAllAreas(ctx, id); err != nil {
		return dto.EmployeeResponse{}, err
	}

	if len(req.AreaIDs) > 0 {
		if err := u.employeeAreaRepo.AssignAreas(ctx, id, req.AreaIDs); err != nil {
			return dto.EmployeeResponse{}, err
		}
	}

	// Reload with preloaded data
	employee, err = u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee), nil
}
