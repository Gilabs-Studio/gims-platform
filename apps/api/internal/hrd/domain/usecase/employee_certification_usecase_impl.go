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

type EmployeeCertificationUsecase struct {
	certificationRepo repositories.EmployeeCertificationRepositoryInterface
	employeeRepo      orgRepositories.EmployeeRepository
}

// NewEmployeeCertificationUsecase creates a new instance of EmployeeCertificationUsecase
func NewEmployeeCertificationUsecase(
	certificationRepo repositories.EmployeeCertificationRepositoryInterface,
	employeeRepo orgRepositories.EmployeeRepository,
) EmployeeCertificationUsecaseInterface {
	return &EmployeeCertificationUsecase{
		certificationRepo: certificationRepo,
		employeeRepo:      employeeRepo,
	}
}

// CreateCertification creates a new employee certification
func (u *EmployeeCertificationUsecase) CreateCertification(ctx context.Context, req *dto.CreateEmployeeCertificationRequest, createdBy string) (*dto.EmployeeCertificationResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, req.EmployeeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	// Validate dates
	issueDate, err := time.Parse("2006-01-02", req.IssueDate)
	if err != nil {
		return nil, errors.New("invalid issue_date format, must be YYYY-MM-DD")
	}

	if req.ExpiryDate != nil && *req.ExpiryDate != "" {
		expiryDate, err := time.Parse("2006-01-02", *req.ExpiryDate)
		if err != nil {
			return nil, errors.New("invalid expiry_date format, must be YYYY-MM-DD")
		}
		if expiryDate.Before(issueDate) {
			return nil, errors.New("expiry date must be after issue date")
		}
	}

	// Convert DTO to model
	certification, err := mapper.ToEmployeeCertificationModel(req, createdBy)
	if err != nil {
		return nil, err
	}

	// Create certification
	if err := u.certificationRepo.Create(ctx, certification); err != nil {
		return nil, err
	}

	// Convert model to response
	return mapper.ToEmployeeCertificationResponse(certification), nil
}

// UpdateCertification updates an existing employee certification
func (u *EmployeeCertificationUsecase) UpdateCertification(ctx context.Context, id string, req *dto.UpdateEmployeeCertificationRequest, updatedBy string) (*dto.EmployeeCertificationResponse, error) {
	// Find existing certification
	certification, err := u.certificationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("certification not found")
		}
		return nil, err
	}

	// Validate dates if provided
	if req.IssueDate != "" {
		_, err := time.Parse("2006-01-02", req.IssueDate)
		if err != nil {
			return nil, errors.New("invalid issue_date format, must be YYYY-MM-DD")
		}
	}

	if req.ExpiryDate != nil && *req.ExpiryDate != "" {
		expiryDate, err := time.Parse("2006-01-02", *req.ExpiryDate)
		if err != nil {
			return nil, errors.New("invalid expiry_date format, must be YYYY-MM-DD")
		}

		issueDate := certification.IssueDate
		if req.IssueDate != "" {
			issueDate, _ = time.Parse("2006-01-02", req.IssueDate)
		}

		if expiryDate.Before(issueDate) {
			return nil, errors.New("expiry date must be after issue date")
		}
	}

	// Update model
	if err := mapper.UpdateEmployeeCertificationModel(certification, req, updatedBy); err != nil {
		return nil, err
	}

	// Save changes
	if err := u.certificationRepo.Update(ctx, certification); err != nil {
		return nil, err
	}

	// Convert model to response
	return mapper.ToEmployeeCertificationResponse(certification), nil
}

// DeleteCertification soft deletes a certification
func (u *EmployeeCertificationUsecase) DeleteCertification(ctx context.Context, id string) error {
	// Check if certification exists
	_, err := u.certificationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("certification not found")
		}
		return err
	}

	return u.certificationRepo.Delete(ctx, id)
}

// GetCertificationByID retrieves a certification by ID
func (u *EmployeeCertificationUsecase) GetCertificationByID(ctx context.Context, id string) (*dto.EmployeeCertificationResponse, error) {
	certification, err := u.certificationRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("certification not found")
		}
		return nil, err
	}

	return mapper.ToEmployeeCertificationResponse(certification), nil
}

// GetAllCertifications retrieves all certifications with pagination and filters
func (u *EmployeeCertificationUsecase) GetAllCertifications(ctx context.Context, page, perPage int, search, employeeID string) ([]*dto.EmployeeCertificationResponse, int64, error) {
	// Enforce max per_page
	if perPage > 100 {
		perPage = 100
	}
	if perPage <= 0 {
		perPage = 20
	}
	if page <= 0 {
		page = 1
	}

	certifications, total, err := u.certificationRepo.FindAll(ctx, page, perPage, search, employeeID)
	if err != nil {
		return nil, 0, err
	}

	return mapper.ToEmployeeCertificationResponses(certifications), total, nil
}

// GetCertificationsByEmployeeID retrieves all certifications for a specific employee
func (u *EmployeeCertificationUsecase) GetCertificationsByEmployeeID(ctx context.Context, employeeID string) ([]*dto.EmployeeCertificationResponse, error) {
	// Validate employee exists
	_, err := u.employeeRepo.FindByID(ctx, employeeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("employee not found")
		}
		return nil, err
	}

	certifications, err := u.certificationRepo.FindByEmployeeID(ctx, employeeID)
	if err != nil {
		return nil, err
	}

	return mapper.ToEmployeeCertificationResponses(certifications), nil
}

// GetExpiringCertifications retrieves certifications expiring within specified days
func (u *EmployeeCertificationUsecase) GetExpiringCertifications(ctx context.Context, daysBeforeExpiry int) ([]*dto.EmployeeCertificationResponse, error) {
	certifications, err := u.certificationRepo.FindExpiringCertifications(ctx, daysBeforeExpiry)
	if err != nil {
		return nil, err
	}

	return mapper.ToEmployeeCertificationResponses(certifications), nil
}

// GetFormData retrieves dropdown options for certification form
func (u *EmployeeCertificationUsecase) GetFormData(ctx context.Context) (*dto.EmployeeCertificationFormDataResponse, error) {
	// Fetch all employees
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

	return &dto.EmployeeCertificationFormDataResponse{
		Employees: employeeOptions,
	}, nil
}
