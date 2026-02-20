package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/repositories"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
	"github.com/gilabs/gims/api/internal/hrd/domain/mapper"
	orgRepositories "github.com/gilabs/gims/api/internal/organization/data/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmployeeEducationHistoryUsecase interface {
	Create(ctx context.Context, req *dto.CreateEmployeeEducationHistoryRequest, userID string) (*dto.EmployeeEducationHistoryResponse, error)
	Update(ctx context.Context, id uuid.UUID, req *dto.UpdateEmployeeEducationHistoryRequest, userID string) (*dto.EmployeeEducationHistoryResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
	GetByID(ctx context.Context, id uuid.UUID) (*dto.EmployeeEducationHistoryResponse, error)
	GetAll(ctx context.Context, req *dto.ListEmployeeEducationHistoriesRequest) ([]*dto.EmployeeEducationHistoryResponse, int64, error)
	GetByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*dto.EmployeeEducationHistoryResponse, error)
	GetFormData(ctx context.Context) (*dto.EmployeeEducationHistoryFormDataResponse, error)
}

type employeeEducationHistoryUsecase struct {
	educationRepo repositories.EmployeeEducationHistoryRepository
	employeeRepo  orgRepositories.EmployeeRepository
	mapper        *mapper.EmployeeEducationHistoryMapper
}

func NewEmployeeEducationHistoryUsecase(
	educationRepo repositories.EmployeeEducationHistoryRepository,
	employeeRepo orgRepositories.EmployeeRepository,
) EmployeeEducationHistoryUsecase {
	return &employeeEducationHistoryUsecase{
		educationRepo: educationRepo,
		employeeRepo:  employeeRepo,
		mapper:        mapper.NewEmployeeEducationHistoryMapper(),
	}
}

func (u *employeeEducationHistoryUsecase) Create(ctx context.Context, req *dto.CreateEmployeeEducationHistoryRequest, userID string) (*dto.EmployeeEducationHistoryResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, req.EmployeeID.String())
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	// Parse dates and validate
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date format, must be YYYY-MM-DD")
	}

	// Validate end date if provided
	if req.EndDate != nil && *req.EndDate != "" {
		parsedEndDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format, must be YYYY-MM-DD")
		}

		// Validate end date is after start date
		if !parsedEndDate.After(startDate) {
			return nil, errors.New("end date must be after start date")
		}
	}

	// Validate GPA range if provided
	if req.GPA != nil {
		if *req.GPA < 0 || *req.GPA > 4.0 {
			return nil, errors.New("GPA must be between 0 and 4.0")
		}
	}

	// Create education history model using mapper
	education, err := u.mapper.FromCreateRequest(req, userID)
	if err != nil {
		return nil, err
	}

	// Save to database
	if err := u.educationRepo.Create(ctx, education); err != nil {
		return nil, err
	}

	// Fetch created record
	created, err := u.educationRepo.FindByID(ctx, education.ID)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(created), nil
}

func (u *employeeEducationHistoryUsecase) Update(ctx context.Context, id uuid.UUID, req *dto.UpdateEmployeeEducationHistoryRequest, userID string) (*dto.EmployeeEducationHistoryResponse, error) {
	// Fetch existing education history
	education, err := u.educationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("education history not found")
		}
		return nil, err
	}

	// Validate date range if dates are being updated
	if req.StartDate != "" && req.EndDate != nil && *req.EndDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, errors.New("invalid start_date format, must be YYYY-MM-DD")
		}

		endDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format, must be YYYY-MM-DD")
		}

		if !endDate.After(startDate) {
			return nil, errors.New("end date must be after start date")
		}
	} else if req.StartDate != "" {
		// Only start date is being updated, validate against existing end date
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, errors.New("invalid start_date format, must be YYYY-MM-DD")
		}

		if education.EndDate != nil && !education.EndDate.After(startDate) {
			return nil, errors.New("end date must be after start date")
		}
	} else if req.EndDate != nil && *req.EndDate != "" {
		// Only end date is being updated, validate against existing start date
		endDate, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date format, must be YYYY-MM-DD")
		}

		if !endDate.After(education.StartDate) {
			return nil, errors.New("end date must be after start date")
		}
	}

	// Validate GPA range if provided
	if req.GPA != nil {
		if *req.GPA < 0 || *req.GPA > 4.0 {
			return nil, errors.New("GPA must be between 0 and 4.0")
		}
	}

	// Update fields using mapper
	if err := u.mapper.FromUpdateRequest(req, education, userID); err != nil {
		return nil, err
	}

	// Save to database
	if err := u.educationRepo.Update(ctx, education); err != nil {
		return nil, err
	}

	// Fetch updated record
	updated, err := u.educationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponse(updated), nil
}

func (u *employeeEducationHistoryUsecase) Delete(ctx context.Context, id uuid.UUID) error {
	// Verify record exists
	_, err := u.educationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("education history not found")
		}
		return err
	}

	return u.educationRepo.Delete(ctx, id)
}

func (u *employeeEducationHistoryUsecase) GetByID(ctx context.Context, id uuid.UUID) (*dto.EmployeeEducationHistoryResponse, error) {
	education, err := u.educationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("education history not found")
		}
		return nil, err
	}

	return u.mapper.ToResponse(education), nil
}

func (u *employeeEducationHistoryUsecase) GetAll(ctx context.Context, req *dto.ListEmployeeEducationHistoriesRequest) ([]*dto.EmployeeEducationHistoryResponse, int64, error) {
	// Set default pagination
	page := req.Page
	if page == 0 {
		page = 1
	}

	perPage := req.PerPage
	if perPage == 0 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}

	// Extract filters
	var employeeID *uuid.UUID
	if req.EmployeeID != nil {
		employeeID = req.EmployeeID
	}

	// Fetch records - pass degree directly as it's already *models.DegreeLevel
	educations, total, err := u.educationRepo.FindAll(ctx, page, perPage, employeeID, req.Degree, req.Search)
	if err != nil {
		return nil, 0, err
	}

	// Build list with employee name/code (same pattern as contract list)
	list := u.mapper.ToResponseList(educations)
	for i, education := range educations {
		emp, err := u.employeeRepo.FindByID(ctx, education.EmployeeID.String())
		if err == nil && emp != nil {
			list[i].EmployeeName = emp.Name
			list[i].EmployeeCode = emp.EmployeeCode
		}
	}
	return list, total, nil
}

func (u *employeeEducationHistoryUsecase) GetByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*dto.EmployeeEducationHistoryResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, employeeID.String())
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	educations, err := u.educationRepo.FindByEmployeeID(ctx, employeeID)
	if err != nil {
		return nil, err
	}

	return u.mapper.ToResponseList(educations), nil
}

func (u *employeeEducationHistoryUsecase) GetFormData(ctx context.Context) (*dto.EmployeeEducationHistoryFormDataResponse, error) {
	// Fetch all active employees
	employees, err := u.employeeRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	// Map employees to form options
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

	// Degree level options
	degreeLevels := []dto.DegreeLevelOption{
		{Value: "ELEMENTARY", Label: "Elementary School"},
		{Value: "JUNIOR_HIGH", Label: "Junior High School"},
		{Value: "SENIOR_HIGH", Label: "Senior High School"},
		{Value: "DIPLOMA", Label: "Diploma (D1/D2/D3)"},
		{Value: "BACHELOR", Label: "Bachelor's Degree (S1)"},
		{Value: "MASTER", Label: "Master's Degree (S2)"},
		{Value: "DOCTORATE", Label: "Doctorate Degree (S3)"},
	}

	return &dto.EmployeeEducationHistoryFormDataResponse{
		Employees:    employeeOptions,
		DegreeLevels: degreeLevels,
	}, nil
}
