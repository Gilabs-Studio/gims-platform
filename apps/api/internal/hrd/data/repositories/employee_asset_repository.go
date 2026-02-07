package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
)

// EmployeeAssetRepository defines the interface for employee asset data access
type EmployeeAssetRepository interface {
	// FindAll retrieves all employee assets with optional filters
	FindAll(ctx context.Context, page, perPage int, search, employeeID, status string) ([]models.EmployeeAsset, int64, error)

	// FindByID retrieves an employee asset by ID
	FindByID(ctx context.Context, id string) (*models.EmployeeAsset, error)

	// FindByEmployeeID retrieves all assets for a specific employee
	FindByEmployeeID(ctx context.Context, employeeID string) ([]models.EmployeeAsset, error)

	// FindBorrowed retrieves all currently borrowed assets (ReturnDate IS NULL)
	FindBorrowed(ctx context.Context) ([]models.EmployeeAsset, error)

	// FindByAssetCode checks if asset code exists
	FindByAssetCode(ctx context.Context, assetCode string) (*models.EmployeeAsset, error)

	// Create creates a new employee asset record
	Create(ctx context.Context, asset *models.EmployeeAsset) error

	// Update updates an existing employee asset record
	Update(ctx context.Context, asset *models.EmployeeAsset) error

	// Delete performs soft delete on an employee asset record
	Delete(ctx context.Context, id string) error
}
