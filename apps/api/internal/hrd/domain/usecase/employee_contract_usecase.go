package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	orgRepositories "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmployeeContractUsecase interface {
	Create(ctx context.Context, req *dto.CreateEmployeeContractRequest, userID uuid.UUID) (*dto.EmployeeContractResponse, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateEmployeeContractRequest, userID uuid.UUID) (*dto.EmployeeContractResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*dto.EmployeeContractResponse, error)
	GetAll(ctx context.Context, req *dto.ListEmployeeContractsRequest) ([]*dto.EmployeeContractListResponse, int64, error)
	GetByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*dto.EmployeeContractResponse, error)
	GetExpiring(ctx context.Context, req *dto.ExpiringContractsRequest) ([]*dto.EmployeeContractResponse, int64, error)
	GetFormData(ctx context.Context) (*dto.EmployeeContractFormDataResponse, error)
}

type employeeContractUsecase struct {
	contractRepo repositories.EmployeeContractRepository
	employeeRepo orgRepositories.EmployeeRepository
	mapper       *mapper.EmployeeContractMapper
}

func NewEmployeeContractUsecase(
	contractRepo repositories.EmployeeContractRepository,
	employeeRepo orgRepositories.EmployeeRepository,
) EmployeeContractUsecase {
	return &employeeContractUsecase{
		contractRepo: contractRepo,
		employeeRepo: employeeRepo,
		mapper:       mapper.NewEmployeeContractMapper(),
	}
}

func (u *employeeContractUsecase) Create(ctx context.Context, req *dto.CreateEmployeeContractRequest, userID uuid.UUID) (*dto.EmployeeContractResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, req.EmployeeID.String())
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	// Check if contract number already exists
	existing, err := u.contractRepo.FindByContractNumber(ctx, req.ContractNumber)
	if err == nil && existing != nil {
		return nil, errors.New("contract number already exists")
	}

	// Parse dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format, must be YYYY-MM-DD")
	}

	var endDate *time.Time
	if req.EndDate != nil {
		parsedEndDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format, must be YYYY-MM-DD")
		}
		endDate = &parsedEndDate
	}

	// Validate contract type business rules
	if req.ContractType == models.ContractTypePermanent {
		if endDate != nil {
			return nil, errors.New("permanent contracts cannot have an end date")
		}
	} else {
		// CONTRACT, INTERNSHIP, PROBATION must have end_date
		if endDate == nil {
			return nil, errors.New("non-permanent contracts must have an end date")
		}

		// Validate end date is after start date
		if !endDate.After(startDate) {
			return nil, errors.New("end date cannot be before or equal to start date")
		}
	}

	// Create contract model
	contract := &models.EmployeeContract{
		ID:             uuid.New(),
		EmployeeID:     req.EmployeeID,
		ContractNumber: req.ContractNumber,
		ContractType:   req.ContractType,
		StartDate:      startDate,
		EndDate:        endDate,
		Salary:         req.Salary,
		JobTitle:       req.JobTitle,
		Department:     req.Department,
		Terms:          req.Terms,
		DocumentPath:   req.DocumentPath,
		Status:         req.Status,
		CreatedBy:      userID,
		UpdatedBy:      nil,
	}

	// Set default status if not provided
	if contract.Status == "" {
		contract.Status = models.ContractStatusActive
	}

	// Save to database
	if err := u.contractRepo.Create(ctx, contract); err != nil {
		return nil, err
	}

	// Fetch created contract
	created, err := u.contractRepo.FindByID(ctx, contract.ID)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(created), nil
}

func (u *employeeContractUsecase) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateEmployeeContractRequest, userID uuid.UUID) (*dto.EmployeeContractResponse, error) {
	// Fetch existing contract
	contract, err := u.contractRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract not found")
		}
		return nil, err
	}

	// Check contract number uniqueness (if changed)
	if req.ContractNumber != "" && req.ContractNumber != contract.ContractNumber {
		existing, err := u.contractRepo.FindByContractNumber(ctx, req.ContractNumber)
		if err == nil && existing != nil && existing.ID != id {
			return nil, errors.New("contract number already exists")
		}
	}

	// Update fields if provided
	if req.ContractNumber != "" {
		contract.ContractNumber = req.ContractNumber
	}

	if req.ContractType != "" {
		contract.ContractType = req.ContractType
	}

	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, errors.New("invalid start_date format, must be YYYY-MM-DD")
		}
		contract.StartDate = startDate
	}

	// Handle end_date update
	if req.EndDate != nil {
		parsedEndDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format, must be YYYY-MM-DD")
		}
		contract.EndDate = &parsedEndDate
	}

	// Validate contract type business rules after updates
	if contract.ContractType == models.ContractTypePermanent {
		if contract.EndDate != nil {
			return nil, errors.New("permanent contracts cannot have an end date")
		}
	} else {
		if contract.EndDate == nil {
			return nil, errors.New("non-permanent contracts must have an end date")
		}

		if !contract.EndDate.After(contract.StartDate) {
			return nil, errors.New("end date cannot be before or equal to start date")
		}
	}

	if req.Salary > 0 {
		contract.Salary = req.Salary
	}

	if req.JobTitle != "" {
		contract.JobTitle = req.JobTitle
	}

	if req.Department != "" {
		contract.Department = req.Department
	}

	if req.Terms != "" {
		contract.Terms = req.Terms
	}

	if req.DocumentPath != "" {
		contract.DocumentPath = req.DocumentPath
	}

	if req.Status != "" {
		contract.Status = req.Status
	}

	// Update audit field
	userIDPtr := userID
	contract.UpdatedBy = &userIDPtr

	// Save changes
	if err := u.contractRepo.Update(ctx, contract); err != nil {
		return nil, err
	}

	// Fetch updated contract
	updated, err := u.contractRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(updated), nil
}

func (u *employeeContractUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	// Check if contract exists
	_, err := u.contractRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("contract not found")
		}
		return err
	}

	// Soft delete
	return u.contractRepo.Delete(ctx, id)
}

func (u *employeeContractUsecase) GetByID(ctx context.Context, id uuid.UUID) (*dto.EmployeeContractResponse, error) {
	contract, err := u.contractRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("contract not found")
		}
		return nil, err
	}

	return u.mapper.ToResponse(contract), nil
}

func (u *employeeContractUsecase) GetAll(ctx context.Context, req *dto.ListEmployeeContractsRequest) ([]*dto.EmployeeContractListResponse, int64, error) {
	// Set defaults
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

	// Fetch contracts with search
	contracts, total, err := u.contractRepo.FindAll(ctx, page, perPage, req.EmployeeID, req.Status, req.ContractType, req.Search)
	if err != nil {
		return nil, 0, err
	}

	// Build list responses with employee names
	responses := make([]*dto.EmployeeContractListResponse, 0, len(contracts))
	for _, contract := range contracts {
		employeeName := ""
		employeeCode := ""

		// Fetch employee details
		employee, err := u.employeeRepo.FindByID(ctx, contract.EmployeeID.String())
		if err == nil && employee != nil {
			employeeName = employee.Name
			employeeCode = employee.EmployeeCode
		}

		responses = append(responses, u.mapper.ToListResponse(contract, employeeName, employeeCode))
	}

	return responses, total, nil
}

func (u *employeeContractUsecase) GetByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*dto.EmployeeContractResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, employeeID.String())
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	contracts, err := u.contractRepo.FindByEmployeeID(ctx, employeeID)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponseList(contracts), nil
}

func (u *employeeContractUsecase) GetExpiring(ctx context.Context, req *dto.ExpiringContractsRequest) ([]*dto.EmployeeContractResponse, int64, error) {
	// Set defaults
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

	days := req.Days
	if days < 1 {
		days = 30 // Default 30 days
	}
	if days > 180 {
		days = 180 // Max 180 days
	}

	// Fetch expiring contracts
	contracts, total, err := u.contractRepo.FindExpiring(ctx, days, page, perPage)
	if err != nil {
		return nil, 0, err
	}

	return u.mapper.ToResponseList(contracts), total, nil
}

func (u *employeeContractUsecase) GetFormData(ctx context.Context) (*dto.EmployeeContractFormDataResponse, error) {
	// Fetch all active employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// Map to form options
	employeeOptions := make([]dto.EmployeeFormOption, 0, len(employees))
	for _, emp := range employees {
		employeeID, err := uuid.Parse(emp.ID)
		if err != nil {
			continue // Skip invalid UUID
		}
		employeeOptions = append(employeeOptions, dto.EmployeeFormOption{
			ID:           employeeID,
			EmployeeCode: emp.EmployeeCode,
			Name:         emp.Name,
		})
	}

	// Contract type options
	contractTypes := []dto.ContractTypeOption{
		{Value: string(models.ContractTypePermanent), Label: "Permanent"},
		{Value: string(models.ContractTypeContract), Label: "Contract"},
		{Value: string(models.ContractTypeInternship), Label: "Internship"},
		{Value: string(models.ContractTypeProbation), Label: "Probation"},
	}

	// Status options
	statuses := []dto.StatusOption{
		{Value: string(models.ContractStatusActive), Label: "Active"},
		{Value: string(models.ContractStatusExpired), Label: "Expired"},
		{Value: string(models.ContractStatusTerminated), Label: "Terminated"},
	}

	return &dto.EmployeeContractFormDataResponse{
		Employees:     employeeOptions,
		ContractTypes: contractTypes,
		Statuses:      statuses,
	}, nil
}
