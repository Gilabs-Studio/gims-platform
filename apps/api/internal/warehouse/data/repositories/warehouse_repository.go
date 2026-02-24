package repositories

import (
	"context"
	"fmt"

	"github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

// WarehouseRepository handles database operations for warehouses
type WarehouseRepository interface {
	Create(ctx context.Context, warehouse *models.Warehouse) error
	GetByID(ctx context.Context, id string) (*models.Warehouse, error)
	GetByCode(ctx context.Context, code string) (*models.Warehouse, error)
	GetNextCode(ctx context.Context) (string, error)
	List(ctx context.Context, params WarehouseListParams) ([]*models.Warehouse, int64, error)
	Update(ctx context.Context, warehouse *models.Warehouse) error
	Delete(ctx context.Context, id string) error
}

// WarehouseListParams defines parameters for listing warehouses
type WarehouseListParams struct {
	ListParams
	IsActive *bool
}

// ListParams defines common list parameters
type ListParams struct {
	Search  string
	SortBy  string
	SortDir string
	Limit   int
	Offset  int
}

type warehouseRepository struct {
	db *gorm.DB
}

// NewWarehouseRepository creates a new warehouse repository
func NewWarehouseRepository(db *gorm.DB) WarehouseRepository {
	return &warehouseRepository{db: db}
}

// Create creates a new warehouse
func (r *warehouseRepository) Create(ctx context.Context, warehouse *models.Warehouse) error {
	return r.db.WithContext(ctx).Create(warehouse).Error
}

// GetByID retrieves a warehouse by ID with preloaded relations
func (r *warehouseRepository) GetByID(ctx context.Context, id string) (*models.Warehouse, error) {
	var warehouse models.Warehouse
	err := r.db.WithContext(ctx).
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province").
		First(&warehouse, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &warehouse, nil
}

// GetNextCode generates the next sequential warehouse code in WH-XXXXX format.
// It counts all warehouses (including soft-deleted) to guarantee uniqueness.
func (r *warehouseRepository) GetNextCode(ctx context.Context) (string, error) {
	var count int64
	if err := r.db.WithContext(ctx).Unscoped().Model(&models.Warehouse{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("WH-%05d", count+1), nil
}

// GetByCode retrieves a warehouse by code
func (r *warehouseRepository) GetByCode(ctx context.Context, code string) (*models.Warehouse, error) {
	var warehouse models.Warehouse
	err := r.db.WithContext(ctx).
		First(&warehouse, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &warehouse, nil
}

// List retrieves warehouses with pagination and filtering
func (r *warehouseRepository) List(ctx context.Context, params WarehouseListParams) ([]*models.Warehouse, int64, error) {
	var warehouses []*models.Warehouse
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Warehouse{})

	// Apply filters
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR address ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	if params.SortBy != "" {
		order := fmt.Sprintf("%s %s", params.SortBy, params.SortDir)
		query = query.Order("is_active DESC, " + order)
	} else {
		query = query.Order("is_active DESC, name ASC")
	}

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	// Preload relations
	query = query.Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province")

	if err := query.Find(&warehouses).Error; err != nil {
		return nil, 0, err
	}

	return warehouses, total, nil
}

// Update updates an existing warehouse
func (r *warehouseRepository) Update(ctx context.Context, warehouse *models.Warehouse) error {
	return r.db.WithContext(ctx).Save(warehouse).Error
}

// Delete soft deletes a warehouse
func (r *warehouseRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Warehouse{}, "id = ?", id).Error
}
