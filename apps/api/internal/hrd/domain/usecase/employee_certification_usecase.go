package usecase

import (
	"context"

	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
)

// EmployeeCertificationUsecaseInterface defines business logic operations for employee certifications
type EmployeeCertificationUsecaseInterface interface {
	CreateCertification(ctx context.Context, req *dto.CreateEmployeeCertificationRequest, createdBy string) (*dto.EmployeeCertificationResponse, error)
	UpdateCertification(ctx context.Context, id string, req *dto.UpdateEmployeeCertificationRequest, updatedBy string) (*dto.EmployeeCertificationResponse, error)
	DeleteCertification(ctx context.Context, id string) error
	GetCertificationByID(ctx context.Context, id string) (*dto.EmployeeCertificationResponse, error)
	GetAllCertifications(ctx context.Context, page, perPage int, search, employeeID string) ([]*dto.EmployeeCertificationResponse, int64, error)
	GetCertificationsByEmployeeID(ctx context.Context, employeeID string) ([]*dto.EmployeeCertificationResponse, error)
	GetExpiringCertifications(ctx context.Context, daysBeforeExpiry int) ([]*dto.EmployeeCertificationResponse, error)
	GetFormData(ctx context.Context) (*dto.EmployeeCertificationFormDataResponse, error)
}
