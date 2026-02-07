package repositories

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm"
)

type employeeAssetRepositoryImpl struct {
	db *gorm.DB
}

// NewEmployeeAssetRepository creates a new instance of EmployeeAssetRepository
func NewEmployeeAssetRepository(db *gorm.DB) EmployeeAssetRepository {
	return &employeeAssetRepositoryImpl{db: db}
}

func (r *employeeAssetRepositoryImpl) FindAll(ctx context.Context, page, perPage int, search, employeeID, status string) ([]models.EmployeeAsset, int64, error) {
	var assets []models.EmployeeAsset
	var total int64

	query := r.db.WithContext(ctx).Model(&models.EmployeeAsset{})

	// Apply search filter (prefix search for GIN index)
	if search != "" {
		searchPattern := search + "%"
		query = query.Where("asset_name ILIKE ? OR asset_code ILIKE ? OR asset_category ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// Filter by employee_id
	if employeeID != "" {
		query = query.Where("employee_id = ?", employeeID)
	}

	// Filter by status
	if status != "" {
		if status == string(models.AssetStatusBorrowed) {
			query = query.Where("return_date IS NULL")
		} else if status == string(models.AssetStatusReturned) {
			query = query.Where("return_date IS NOT NULL")
		}
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count employee assets: %w", err)
	}

	// Apply pagination
	offset := (page - 1) * perPage
	query = query.Offset(offset).Limit(perPage)

	// Order by borrow_date DESC (newest first)
	query = query.Order("borrow_date DESC")

	if err := query.Find(&assets).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to find employee assets: %w", err)
	}

	return assets, total, nil
}

func (r *employeeAssetRepositoryImpl) FindByID(ctx context.Context, id string) (*models.EmployeeAsset, error) {
	var asset models.EmployeeAsset
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&asset).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find employee asset by ID: %w", err)
	}
	return &asset, nil
}

func (r *employeeAssetRepositoryImpl) FindByEmployeeID(ctx context.Context, employeeID string) ([]models.EmployeeAsset, error) {
	var assets []models.EmployeeAsset
	if err := r.db.WithContext(ctx).
		Where("employee_id = ?", employeeID).
		Order("borrow_date DESC").
		Find(&assets).Error; err != nil {
		return nil, fmt.Errorf("failed to find assets by employee ID: %w", err)
	}
	return assets, nil
}

func (r *employeeAssetRepositoryImpl) FindBorrowed(ctx context.Context) ([]models.EmployeeAsset, error) {
	var assets []models.EmployeeAsset
	if err := r.db.WithContext(ctx).
		Where("return_date IS NULL").
		Order("borrow_date ASC"). // Oldest borrowed first (urgent)
		Find(&assets).Error; err != nil {
		return nil, fmt.Errorf("failed to find borrowed assets: %w", err)
	}
	return assets, nil
}

func (r *employeeAssetRepositoryImpl) FindByAssetCode(ctx context.Context, assetCode string) (*models.EmployeeAsset, error) {
	var asset models.EmployeeAsset
	if err := r.db.WithContext(ctx).Where("asset_code = ?", assetCode).First(&asset).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to find asset by code: %w", err)
	}
	return &asset, nil
}

func (r *employeeAssetRepositoryImpl) Create(ctx context.Context, asset *models.EmployeeAsset) error {
	if err := r.db.WithContext(ctx).Create(asset).Error; err != nil {
		return fmt.Errorf("failed to create employee asset: %w", err)
	}
	return nil
}

func (r *employeeAssetRepositoryImpl) Update(ctx context.Context, asset *models.EmployeeAsset) error {
	if err := r.db.WithContext(ctx).Save(asset).Error; err != nil {
		return fmt.Errorf("failed to update employee asset: %w", err)
	}
	return nil
}

func (r *employeeAssetRepositoryImpl) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.EmployeeAsset{}).Error; err != nil {
		return fmt.Errorf("failed to delete employee asset: %w", err)
	}
	return nil
}
