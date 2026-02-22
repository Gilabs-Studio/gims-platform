package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/gilabs/gims/api/internal/organization/domain/dto"
	"github.com/gilabs/gims/api/internal/organization/domain/mapper"
	"github.com/google/uuid"
)

var (
	ErrEmployeeNotFound              = errors.New("employee not found")
	ErrEmployeeCodeExists            = errors.New("employee code already exists")
	ErrEmployeeInvalidApprovalAction = errors.New("invalid approval action")
	ErrCannotApproveNonPending       = errors.New("can only approve/reject pending employees")
	ErrReplacementNotFound           = errors.New("replacement employee not found")
	ErrContractNotFound              = errors.New("contract not found")
	ErrInvalidContractType           = errors.New("invalid contract type")
	ErrInvalidContractDates          = errors.New("invalid contract dates")
	ErrPKWTTCannotHaveEndDate        = errors.New("PKWTT contract cannot have end date")
	ErrPKWTMustHaveEndDate           = errors.New("PKWT/Intern contract must have end date")
	ErrCannotModifyTerminated        = errors.New("cannot modify terminated contract")
	ErrCannotTerminateInactive       = errors.New("can only terminate active contracts")
	ErrActiveContractExists          = errors.New("employee already has an active contract")
	ErrNoActiveContract              = errors.New("employee has no active contract")
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
	// AssignSupervisorAreas sets the areas in which the employee acts as supervisor.
	AssignSupervisorAreas(ctx context.Context, id string, req dto.AssignEmployeeSupervisorAreasRequest) (dto.EmployeeResponse, error)
	// BulkUpdateAreas replaces all area assignments for an employee in one operation.
	BulkUpdateAreas(ctx context.Context, employeeID string, req dto.BulkUpdateEmployeeAreasRequest) (dto.EmployeeResponse, error)
	// RemoveAreaAssignment removes a single area assignment from an employee.
	RemoveAreaAssignment(ctx context.Context, employeeID string, areaID string) error
	// GetFormData returns dropdown options for the employee form.
	GetFormData(ctx context.Context) (*dto.EmployeeFormDataResponse, error)
	// Contract management methods
	GetEmployeeContracts(ctx context.Context, employeeID string) ([]dto.EmployeeContractResponse, error)
	CreateEmployeeContract(ctx context.Context, employeeID string, req dto.CreateEmployeeContractRequest, createdBy string) (dto.EmployeeContractResponse, error)
	GetActiveContract(ctx context.Context, employeeID string) (*dto.EmployeeContractResponse, error)
	UpdateEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.UpdateEmployeeContractRequest) (dto.EmployeeContractResponse, error)
	DeleteEmployeeContract(ctx context.Context, employeeID string, contractID string) error
	TerminateEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.TerminateEmployeeContractRequest, terminatedBy string) (dto.EmployeeContractResponse, error)
	RenewEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.RenewEmployeeContractRequest, renewedBy string) (dto.EmployeeContractResponse, error)
	CorrectActiveEmployeeContract(ctx context.Context, employeeID string, req dto.CorrectEmployeeContractRequest, correctedBy string) (dto.EmployeeContractResponse, error)
}

type employeeUsecase struct {
	employeeRepo     repositories.EmployeeRepository
	employeeAreaRepo repositories.EmployeeAreaRepository
	divisionRepo     repositories.DivisionRepository
	jobPositionRepo  repositories.JobPositionRepository
	companyRepo      repositories.CompanyRepository
	areaRepo         repositories.AreaRepository
	contractRepo     repositories.EmployeeContractRepository
}

// NewEmployeeUsecase creates a new EmployeeUsecase instance
func NewEmployeeUsecase(
	employeeRepo repositories.EmployeeRepository,
	employeeAreaRepo repositories.EmployeeAreaRepository,
	divisionRepo repositories.DivisionRepository,
	jobPositionRepo repositories.JobPositionRepository,
	companyRepo repositories.CompanyRepository,
	areaRepo repositories.AreaRepository,
	contractRepo repositories.EmployeeContractRepository,
) EmployeeUsecase {
	return &employeeUsecase{
		employeeRepo:     employeeRepo,
		employeeAreaRepo: employeeAreaRepo,
		divisionRepo:     divisionRepo,
		jobPositionRepo:  jobPositionRepo,
		companyRepo:      companyRepo,
		areaRepo:         areaRepo,
		contractRepo:     contractRepo,
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

	ptkpStatus := models.PTKPTK0
	if req.PTKPStatus != "" {
		ptkpStatus = models.PTKPStatus(req.PTKPStatus)
	}

	totalLeaveQuota := 12
	if req.TotalLeaveQuota > 0 {
		totalLeaveQuota = req.TotalLeaveQuota
	}

	employee := &models.Employee{
		EmployeeCode:     req.EmployeeCode,
		Name:             req.Name,
		Email:            req.Email,
		Phone:            req.Phone,
		UserID:           req.UserID,
		DivisionID:       req.DivisionID,
		JobPositionID:    req.JobPositionID,
		CompanyID:        req.CompanyID,
		DateOfBirth:      req.DateOfBirth,
		PlaceOfBirth:     req.PlaceOfBirth,
		Gender:           models.Gender(req.Gender),
		Religion:         req.Religion,
		Address:          req.Address,
		VillageID:        req.VillageID,
		NIK:              req.NIK,
		NPWP:             req.NPWP,
		BPJS:             req.BPJS,
		TotalLeaveQuota:  totalLeaveQuota,
		PTKPStatus:       ptkpStatus,
		IsDisability:     req.IsDisability,
		ReplacementForID: req.ReplacementForID,
		Status:           models.EmployeeStatusDraft,
		IsApproved:       false,
		CreatedBy:        &createdBy,
		IsActive:         isActive,
	}

	if err := u.employeeRepo.Create(ctx, employee); err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Create initial contract if provided
	var currentContract *models.EmployeeContract
	if req.InitialContract != nil {
		// Validate contract type
		contractType := models.ContractType(req.InitialContract.ContractType)
		if contractType != models.ContractTypePKWTT && contractType != models.ContractTypePKWT && contractType != models.ContractTypeIntern {
			return dto.EmployeeResponse{}, ErrInvalidContractType
		}

		// Parse dates
		startDate, err := time.Parse("2006-01-02", req.InitialContract.StartDate)
		if err != nil {
			return dto.EmployeeResponse{}, fmt.Errorf("invalid start_date format: %w", err)
		}

		var endDate *time.Time
		if req.InitialContract.EndDate != "" {
			parsedEndDate, err := time.Parse("2006-01-02", req.InitialContract.EndDate)
			if err != nil {
				return dto.EmployeeResponse{}, fmt.Errorf("invalid end_date format: %w", err)
			}
			endDate = &parsedEndDate
		}

		// Validation: PKWTT cannot have end_date, PKWT/Intern must have end_date
		if contractType == models.ContractTypePKWTT && endDate != nil {
			return dto.EmployeeResponse{}, ErrPKWTTCannotHaveEndDate
		}
		if (contractType == models.ContractTypePKWT || contractType == models.ContractTypeIntern) && endDate == nil {
			return dto.EmployeeResponse{}, ErrPKWTMustHaveEndDate
		}

		createdByUUID, err := uuid.Parse(createdBy)
		if err != nil {
			return dto.EmployeeResponse{}, fmt.Errorf("invalid created_by UUID: %w", err)
		}

		employeeUUID, err := uuid.Parse(employee.ID)
		if err != nil {
			return dto.EmployeeResponse{}, fmt.Errorf("invalid employee ID: %w", err)
		}

		contract := &models.EmployeeContract{
			EmployeeID:     employeeUUID,
			ContractNumber: req.InitialContract.ContractNumber,
			ContractType:   contractType,
			StartDate:      startDate,
			EndDate:        endDate,
			DocumentPath:   req.InitialContract.DocumentPath,
			Status:         models.ContractStatusActive,
			CreatedBy:      createdByUUID,
		}

		if err := u.contractRepo.Create(ctx, contract); err != nil {
			return dto.EmployeeResponse{}, fmt.Errorf("failed to create contract: %w", err)
		}
		currentContract = contract
	}

	// Assign member areas if provided
	if len(req.AreaIDs) > 0 {
		if err := u.employeeAreaRepo.AssignAreas(ctx, employee.ID, req.AreaIDs); err != nil {
			return dto.EmployeeResponse{}, err
		}
	}

	// Assign supervisor areas if provided
	if len(req.SupervisedAreaIDs) > 0 {
		if err := u.employeeAreaRepo.AssignSupervisorAreas(ctx, employee.ID, req.SupervisedAreaIDs); err != nil {
			return dto.EmployeeResponse{}, err
		}
	}

	// Reload with preloaded data
	employee, err := u.employeeRepo.FindByID(ctx, employee.ID)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
}

func (u *employeeUsecase) GetByID(ctx context.Context, id string) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Fetch active contract
	var currentContract *models.EmployeeContract
	employeeUUID, err := uuid.Parse(id)
	if err == nil {
		contract, _ := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
		if contract != nil {
			currentContract = contract
		}
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
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

	// Update area assignments if provided (full replacement for member areas)
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

	// Update supervised areas if provided (upsert with is_supervisor=true)
	if req.SupervisedAreaIDs != nil {
		if len(req.SupervisedAreaIDs) > 0 {
			if err := u.employeeAreaRepo.AssignSupervisorAreas(ctx, id, req.SupervisedAreaIDs); err != nil {
				return dto.EmployeeResponse{}, err
			}
		}
	}

	// Reload with preloaded data
	employee, err = u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Fetch active contract
	var currentContract *models.EmployeeContract
	employeeUUID, _ := uuid.Parse(id)
	contract, _ := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if contract != nil {
		currentContract = contract
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
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

	return mapper.ToEmployeeResponse(employee, nil), nil
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

	return mapper.ToEmployeeResponse(employee, nil), nil
}

func (u *employeeUsecase) AssignAreas(ctx context.Context, id string, req dto.AssignEmployeeAreasRequest) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Replace all area assignments (member role only)
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

	// Fetch active contract
	var currentContract *models.EmployeeContract
	employeeUUID, _ := uuid.Parse(id)
	contract, _ := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if contract != nil {
		currentContract = contract
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
}

func (u *employeeUsecase) AssignSupervisorAreas(ctx context.Context, id string, req dto.AssignEmployeeSupervisorAreasRequest) (dto.EmployeeResponse, error) {
	employee, err := u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Upsert areas with is_supervisor = true
	if err := u.employeeAreaRepo.AssignSupervisorAreas(ctx, id, req.AreaIDs); err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Reload with preloaded data
	employee, err = u.employeeRepo.FindByID(ctx, id)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Fetch active contract
	var currentContract *models.EmployeeContract
	employeeUUID, _ := uuid.Parse(id)
	contract, _ := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if contract != nil {
		currentContract = contract
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
}

func (u *employeeUsecase) BulkUpdateAreas(ctx context.Context, employeeID string, req dto.BulkUpdateEmployeeAreasRequest) (dto.EmployeeResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeResponse{}, ErrEmployeeNotFound
	}

	// Remove all existing assignments then re-create with the provided roles
	if err := u.employeeAreaRepo.RemoveAllAreas(ctx, employeeID); err != nil {
		return dto.EmployeeResponse{}, err
	}

	for _, a := range req.Assignments {
		if err := u.employeeAreaRepo.AssignAreaWithRole(ctx, employeeID, a.AreaID, a.IsSupervisor); err != nil {
			return dto.EmployeeResponse{}, err
		}
	}

	// Reload with preloaded data
	employee, err := u.employeeRepo.FindByID(ctx, employeeID)
	if err != nil {
		return dto.EmployeeResponse{}, err
	}

	// Fetch active contract
	var currentContract *models.EmployeeContract
	employeeUUID, _ := uuid.Parse(employeeID)
	contract, _ := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if contract != nil {
		currentContract = contract
	}

	return mapper.ToEmployeeResponse(employee, currentContract), nil
}

func (u *employeeUsecase) RemoveAreaAssignment(ctx context.Context, employeeID string, areaID string) error {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return ErrEmployeeNotFound
	}

	return u.employeeAreaRepo.RemoveFromArea(ctx, employeeID, areaID)
}

func (u *employeeUsecase) GetFormData(ctx context.Context) (*dto.EmployeeFormDataResponse, error) {
	// Use a generous PerPage to retrieve all options for each dropdown
	const maxOptions = 100

	divisions, _, err := u.divisionRepo.List(ctx, &dto.ListDivisionsRequest{Page: 1, PerPage: maxOptions})
	if err != nil {
		return nil, err
	}
	jobPositions, _, err := u.jobPositionRepo.List(ctx, &dto.ListJobPositionsRequest{Page: 1, PerPage: maxOptions})
	if err != nil {
		return nil, err
	}
	companies, _, err := u.companyRepo.List(ctx, &dto.ListCompaniesRequest{Page: 1, PerPage: maxOptions})
	if err != nil {
		return nil, err
	}
	areas, _, err := u.areaRepo.List(ctx, &dto.ListAreasRequest{Page: 1, PerPage: maxOptions})
	if err != nil {
		return nil, err
	}

	divOpts := make([]dto.FormOption, len(divisions))
	for i, d := range divisions {
		divOpts[i] = dto.FormOption{ID: d.ID, Name: d.Name}
	}

	jpOpts := make([]dto.FormOption, len(jobPositions))
	for i, j := range jobPositions {
		jpOpts[i] = dto.FormOption{ID: j.ID, Name: j.Name}
	}

	compOpts := make([]dto.FormOption, len(companies))
	for i, c := range companies {
		compOpts[i] = dto.FormOption{ID: c.ID, Name: c.Name}
	}

	areaOpts := make([]dto.FormOption, len(areas))
	for i, a := range areas {
		areaOpts[i] = dto.FormOption{ID: a.ID, Name: a.Name}
	}

	return &dto.EmployeeFormDataResponse{
		Divisions:    divOpts,
		JobPositions: jpOpts,
		Companies:    compOpts,
		Areas:        areaOpts,
	}, nil
}

// Contract management methods

func (u *employeeUsecase) GetEmployeeContracts(ctx context.Context, employeeID string) ([]dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return nil, ErrEmployeeNotFound
	}

	employeeUUID, err := uuid.Parse(employeeID)
	if err != nil {
		return nil, fmt.Errorf("invalid employee ID: %w", err)
	}

	contracts, err := u.contractRepo.FindByEmployeeID(ctx, employeeUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch contracts: %w", err)
	}

	return u.mapContractsToResponse(contracts), nil
}

func (u *employeeUsecase) CreateEmployeeContract(ctx context.Context, employeeID string, req dto.CreateEmployeeContractRequest, createdBy string) (dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeContractResponse{}, ErrEmployeeNotFound
	}

	employeeUUID, err := uuid.Parse(employeeID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid employee ID: %w", err)
	}

	// Check if employee already has an active contract
	hasActive, err := u.contractRepo.HasActiveContract(ctx, employeeUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to check active contract: %w", err)
	}
	if hasActive {
		return dto.EmployeeContractResponse{}, ErrActiveContractExists
	}

	// Validate contract type
	contractType := models.ContractType(req.ContractType)
	if contractType != models.ContractTypePKWTT && contractType != models.ContractTypePKWT && contractType != models.ContractTypeIntern {
		return dto.EmployeeContractResponse{}, ErrInvalidContractType
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid start_date format: %w", err)
	}

	var endDate *time.Time
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return dto.EmployeeContractResponse{}, fmt.Errorf("invalid end_date format: %w", err)
		}
		endDate = &parsedEndDate
	}

	// Validation: PKWTT cannot have end_date, PKWT/Intern must have end_date
	if contractType == models.ContractTypePKWTT && endDate != nil {
		return dto.EmployeeContractResponse{}, ErrPKWTTCannotHaveEndDate
	}
	if (contractType == models.ContractTypePKWT || contractType == models.ContractTypeIntern) && endDate == nil {
		return dto.EmployeeContractResponse{}, ErrPKWTMustHaveEndDate
	}

	// Check if contract number already exists
	existing, _ := u.contractRepo.FindByContractNumber(ctx, req.ContractNumber)
	if existing != nil {
		return dto.EmployeeContractResponse{}, errors.New("contract number already exists")
	}

	createdByUUID, err := uuid.Parse(createdBy)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid created_by UUID: %w", err)
	}

	contract := &models.EmployeeContract{
		EmployeeID:     employeeUUID,
		ContractNumber: req.ContractNumber,
		ContractType:   contractType,
		StartDate:      startDate,
		EndDate:        endDate,
		DocumentPath:   req.DocumentPath,
		Status:         models.ContractStatusActive,
		CreatedBy:      createdByUUID,
	}

	if err := u.contractRepo.Create(ctx, contract); err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to create contract: %w", err)
	}

	return u.mapContractToResponse(contract), nil
}

func (u *employeeUsecase) GetActiveContract(ctx context.Context, employeeID string) (*dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return nil, ErrEmployeeNotFound
	}

	employeeUUID, err := uuid.Parse(employeeID)
	if err != nil {
		return nil, fmt.Errorf("invalid employee ID: %w", err)
	}

	contract, err := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if err != nil {
		return nil, ErrNoActiveContract
	}

	resp := u.mapContractToResponse(contract)
	return &resp, nil
}

func (u *employeeUsecase) UpdateEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.UpdateEmployeeContractRequest) (dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeContractResponse{}, ErrEmployeeNotFound
	}

	contractUUID, err := uuid.Parse(contractID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid contract ID: %w", err)
	}

	contract, err := u.contractRepo.FindByID(ctx, contractUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, ErrContractNotFound
	}

	// Verify contract belongs to employee
	employeeUUID, _ := uuid.Parse(employeeID)
	if contract.EmployeeID != employeeUUID {
		return dto.EmployeeContractResponse{}, errors.New("contract does not belong to employee")
	}

	// Cannot modify terminated contracts
	if contract.Status == models.ContractStatusTerminated {
		return dto.EmployeeContractResponse{}, ErrCannotModifyTerminated
	}

	// Update fields if provided
	if req.ContractNumber != "" {
		// Check uniqueness if changed
		if req.ContractNumber != contract.ContractNumber {
			existing, _ := u.contractRepo.FindByContractNumber(ctx, req.ContractNumber)
			if existing != nil && existing.ID != contractUUID {
				return dto.EmployeeContractResponse{}, errors.New("contract number already exists")
			}
		}
		contract.ContractNumber = req.ContractNumber
	}

	if req.ContractType != "" {
		contractType := models.ContractType(req.ContractType)
		if contractType != models.ContractTypePKWTT && contractType != models.ContractTypePKWT && contractType != models.ContractTypeIntern {
			return dto.EmployeeContractResponse{}, ErrInvalidContractType
		}
		contract.ContractType = contractType
	}

	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return dto.EmployeeContractResponse{}, fmt.Errorf("invalid start_date format: %w", err)
		}
		contract.StartDate = startDate
	}

	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return dto.EmployeeContractResponse{}, fmt.Errorf("invalid end_date format: %w", err)
		}
		contract.EndDate = &endDate
	} else if req.EndDate == "" && contract.EndDate != nil {
		// Explicitly clear end date
		contract.EndDate = nil
	}

	// Re-validate contract type vs end date
	if contract.ContractType == models.ContractTypePKWTT && contract.EndDate != nil {
		return dto.EmployeeContractResponse{}, ErrPKWTTCannotHaveEndDate
	}
	if (contract.ContractType == models.ContractTypePKWT || contract.ContractType == models.ContractTypeIntern) && contract.EndDate == nil {
		return dto.EmployeeContractResponse{}, ErrPKWTMustHaveEndDate
	}

	if req.DocumentPath != "" {
		contract.DocumentPath = req.DocumentPath
	}

	if err := u.contractRepo.Update(ctx, contract); err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to update contract: %w", err)
	}

	return u.mapContractToResponse(contract), nil
}

func (u *employeeUsecase) DeleteEmployeeContract(ctx context.Context, employeeID string, contractID string) error {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return ErrEmployeeNotFound
	}

	contractUUID, err := uuid.Parse(contractID)
	if err != nil {
		return fmt.Errorf("invalid contract ID: %w", err)
	}

	contract, err := u.contractRepo.FindByID(ctx, contractUUID)
	if err != nil {
		return ErrContractNotFound
	}

	// Verify contract belongs to employee
	employeeUUID, _ := uuid.Parse(employeeID)
	if contract.EmployeeID != employeeUUID {
		return errors.New("contract does not belong to employee")
	}

	return u.contractRepo.Delete(ctx, contractUUID)
}

func (u *employeeUsecase) TerminateEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.TerminateEmployeeContractRequest, terminatedBy string) (dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeContractResponse{}, ErrEmployeeNotFound
	}

	contractUUID, err := uuid.Parse(contractID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid contract ID: %w", err)
	}

	contract, err := u.contractRepo.FindByID(ctx, contractUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, ErrContractNotFound
	}

	// Verify contract belongs to employee
	employeeUUID, _ := uuid.Parse(employeeID)
	if contract.EmployeeID != employeeUUID {
		return dto.EmployeeContractResponse{}, errors.New("contract does not belong to employee")
	}

	// Can only terminate active contracts
	if contract.Status != models.ContractStatusActive {
		return dto.EmployeeContractResponse{}, ErrCannotTerminateInactive
	}

	now := time.Now()
	contract.Status = models.ContractStatusTerminated
	contract.TerminatedAt = &now
	contract.TerminationReason = req.Reason
	contract.TerminationNotes = req.Notes

	if err := u.contractRepo.Update(ctx, contract); err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to terminate contract: %w", err)
	}

	return u.mapContractToResponse(contract), nil
}

func (u *employeeUsecase) RenewEmployeeContract(ctx context.Context, employeeID string, contractID string, req dto.RenewEmployeeContractRequest, renewedBy string) (dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeContractResponse{}, ErrEmployeeNotFound
	}

	contractUUID, err := uuid.Parse(contractID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid contract ID: %w", err)
	}

	oldContract, err := u.contractRepo.FindByID(ctx, contractUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, ErrContractNotFound
	}

	// Verify contract belongs to employee
	employeeUUID, _ := uuid.Parse(employeeID)
	if oldContract.EmployeeID != employeeUUID {
		return dto.EmployeeContractResponse{}, errors.New("contract does not belong to employee")
	}

	// Check if employee already has an active contract
	hasActive, err := u.contractRepo.HasActiveContract(ctx, employeeUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to check active contract: %w", err)
	}
	if hasActive {
		return dto.EmployeeContractResponse{}, ErrActiveContractExists
	}

	// Validate contract type
	contractType := models.ContractType(req.ContractType)
	if contractType != models.ContractTypePKWTT && contractType != models.ContractTypePKWT && contractType != models.ContractTypeIntern {
		return dto.EmployeeContractResponse{}, ErrInvalidContractType
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid start_date format: %w", err)
	}

	var endDate *time.Time
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return dto.EmployeeContractResponse{}, fmt.Errorf("invalid end_date format: %w", err)
		}
		endDate = &parsedEndDate
	}

	// Validation: PKWTT cannot have end_date, PKWT/Intern must have end_date
	if contractType == models.ContractTypePKWTT && endDate != nil {
		return dto.EmployeeContractResponse{}, ErrPKWTTCannotHaveEndDate
	}
	if (contractType == models.ContractTypePKWT || contractType == models.ContractTypeIntern) && endDate == nil {
		return dto.EmployeeContractResponse{}, ErrPKWTMustHaveEndDate
	}

	// Check if contract number already exists
	existing, _ := u.contractRepo.FindByContractNumber(ctx, req.ContractNumber)
	if existing != nil {
		return dto.EmployeeContractResponse{}, errors.New("contract number already exists")
	}

	createdByUUID, err := uuid.Parse(renewedBy)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid renewed_by UUID: %w", err)
	}

	// Create new contract
	newContract := &models.EmployeeContract{
		EmployeeID:     employeeUUID,
		ContractNumber: req.ContractNumber,
		ContractType:   contractType,
		StartDate:      startDate,
		EndDate:        endDate,
		DocumentPath:   req.DocumentPath,
		Status:         models.ContractStatusActive,
		CreatedBy:      createdByUUID,
	}

	if err := u.contractRepo.Create(ctx, newContract); err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to create renewed contract: %w", err)
	}

	// Expire the old contract
	now := time.Now()
	oldContract.Status = models.ContractStatusExpired
	oldContract.ExpiredAt = &now
	if err := u.contractRepo.Update(ctx, oldContract); err != nil {
		// Log error but don't fail the renewal
		_ = err
	}

	return u.mapContractToResponse(newContract), nil
}

func (u *employeeUsecase) CorrectActiveEmployeeContract(ctx context.Context, employeeID string, req dto.CorrectEmployeeContractRequest, correctedBy string) (dto.EmployeeContractResponse, error) {
	// Verify employee exists
	if _, err := u.employeeRepo.FindByID(ctx, employeeID); err != nil {
		return dto.EmployeeContractResponse{}, ErrEmployeeNotFound
	}

	employeeUUID, err := uuid.Parse(employeeID)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid employee ID: %w", err)
	}

	// Get active contract
	activeContract, err := u.contractRepo.FindActiveByEmployeeID(ctx, employeeUUID)
	if err != nil {
		return dto.EmployeeContractResponse{}, ErrNoActiveContract
	}

	// Create corrected contract
	createdByUUID, err := uuid.Parse(correctedBy)
	if err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("invalid corrected_by UUID: %w", err)
	}

	var endDate *time.Time
	if req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return dto.EmployeeContractResponse{}, fmt.Errorf("invalid end_date format: %w", err)
		}
		endDate = &parsedEndDate
	}

	// Validation: PKWTT cannot have end_date, PKWT/Intern must have end_date
	if activeContract.ContractType == models.ContractTypePKWTT && endDate != nil {
		return dto.EmployeeContractResponse{}, ErrPKWTTCannotHaveEndDate
	}
	if (activeContract.ContractType == models.ContractTypePKWT || activeContract.ContractType == models.ContractTypeIntern) && endDate == nil {
		return dto.EmployeeContractResponse{}, ErrPKWTMustHaveEndDate
	}

	// Generate new contract number based on old one
	newContractNumber := activeContract.ContractNumber + "-C"

	newContract := &models.EmployeeContract{
		EmployeeID:              employeeUUID,
		ContractNumber:          newContractNumber,
		ContractType:            activeContract.ContractType,
		StartDate:               activeContract.StartDate,
		EndDate:                 endDate,
		DocumentPath:            req.DocumentPath,
		Status:                  models.ContractStatusActive,
		CreatedBy:               createdByUUID,
		CorrectedFromContractID: &activeContract.ID,
	}

	if err := u.contractRepo.Create(ctx, newContract); err != nil {
		return dto.EmployeeContractResponse{}, fmt.Errorf("failed to create corrected contract: %w", err)
	}

	// Expire the old contract
	now := time.Now()
	activeContract.Status = models.ContractStatusExpired
	activeContract.ExpiredAt = &now
	if err := u.contractRepo.Update(ctx, activeContract); err != nil {
		// Log error but don't fail the correction
		_ = err
	}

	return u.mapContractToResponse(newContract), nil
}

// Helper methods

func (u *employeeUsecase) mapContractToResponse(contract *models.EmployeeContract) dto.EmployeeContractResponse {
	resp := dto.EmployeeContractResponse{
		ID:                      contract.ID,
		EmployeeID:              contract.EmployeeID,
		ContractNumber:          contract.ContractNumber,
		ContractType:            string(contract.ContractType),
		StartDate:               contract.StartDate.Format("2006-01-02"),
		DocumentPath:            contract.DocumentPath,
		Status:                  string(contract.Status),
		IsExpiringSoon:          contract.IsExpiringSoon(30),
		TerminationReason:       contract.TerminationReason,
		TerminationNotes:        contract.TerminationNotes,
		CorrectedFromContractID: contract.CorrectedFromContractID,
		CreatedAt:               contract.CreatedAt,
		UpdatedAt:               contract.UpdatedAt,
	}

	if contract.EndDate != nil {
		endDate := contract.EndDate.Format("2006-01-02")
		resp.EndDate = &endDate
		daysUntil := contract.DaysUntilExpiry()
		resp.DaysUntilExpiry = &daysUntil
	}

	if contract.TerminatedAt != nil {
		resp.TerminatedAt = contract.TerminatedAt
	}

	if contract.ExpiredAt != nil {
		resp.ExpiredAt = contract.ExpiredAt
	}

	return resp
}

func (u *employeeUsecase) mapContractsToResponse(contracts []*models.EmployeeContract) []dto.EmployeeContractResponse {
	result := make([]dto.EmployeeContractResponse, len(contracts))
	for i, contract := range contracts {
		result[i] = u.mapContractToResponse(contract)
	}
	return result
}
