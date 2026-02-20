package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
)

// EmployeeCertificationRepositoryInterface defines methods for employee certification data access
type EmployeeCertificationRepositoryInterface interface {
	Create(ctx context.Context, certification *models.EmployeeCertification) error
	Update(ctx context.Context, certification *models.EmployeeCertification) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*models.EmployeeCertification, error)
	FindAll(ctx context.Context, page, perPage int, search, employeeID, status string) ([]*models.EmployeeCertification, int64, error)
	FindByEmployeeID(ctx context.Context, employeeID string) ([]*models.EmployeeCertification, error)
	FindExpiringCertifications(ctx context.Context, daysBeforeExpiry int) ([]*models.EmployeeCertification, error)
}
