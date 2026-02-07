package usecase

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/hrd/domain/dto"
)

// EmployeeAssetUsecase defines the interface for employee asset business logic
type EmployeeAssetUsecase interface {
	// GetAll retrieves all employee assets with pagination and filters
	GetAll(ctx context.Context, page, perPage int, search, employeeID, status string) ([]*dto.EmployeeAssetResponse, *response.PaginationMeta, error)

	// GetByID retrieves an employee asset by ID
	GetByID(ctx context.Context, id string) (*dto.EmployeeAssetResponse, error)

	// GetByEmployeeID retrieves all assets for a specific employee
	GetByEmployeeID(ctx context.Context, employeeID string) ([]*dto.EmployeeAssetResponse, error)

	// GetBorrowed retrieves all currently borrowed assets
	GetBorrowed(ctx context.Context) ([]*dto.EmployeeAssetResponse, error)

	// GetFormData retrieves form dropdown data (employees)
	GetFormData(ctx context.Context) (*dto.EmployeeAssetFormDataResponse, error)

	// Create creates a new employee asset record
	Create(ctx context.Context, req *dto.CreateEmployeeAssetRequest) (*dto.EmployeeAssetResponse, error)

	// Update updates an existing employee asset record
	Update(ctx context.Context, id string, req *dto.UpdateEmployeeAssetRequest) (*dto.EmployeeAssetResponse, error)

	// ReturnAsset marks an asset as returned
	ReturnAsset(ctx context.Context, id string, req *dto.ReturnAssetRequest) (*dto.EmployeeAssetResponse, error)

	// Delete performs soft delete on an employee asset record
	Delete(ctx context.Context, id string) error
}
