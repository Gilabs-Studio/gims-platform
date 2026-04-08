package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// OutletRepository handles database operations for outlets
type OutletRepository interface {
	Create(ctx context.Context, outlet *models.Outlet) error
	GetByID(ctx context.Context, id string) (*models.Outlet, error)
	GetByCode(ctx context.Context, code string) (*models.Outlet, error)
	GetNextCode(ctx context.Context) (string, error)
	List(ctx context.Context, params OutletListParams) ([]*models.Outlet, int64, error)
	Update(ctx context.Context, outlet *models.Outlet) error
	Delete(ctx context.Context, id string) error
}

// OutletListParams defines parameters for listing outlets
type OutletListParams struct {
	Search    string
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
	IsActive  *bool
	CompanyID string
}

type outletRepository struct {
	db *gorm.DB
}

// NewOutletRepository creates a new outlet repository
func NewOutletRepository(db *gorm.DB) OutletRepository {
	return &outletRepository{db: db}
}

// Create creates a new outlet
func (r *outletRepository) Create(ctx context.Context, outlet *models.Outlet) error {
	return r.db.WithContext(ctx).Create(outlet).Error
}

// GetByID retrieves an outlet by ID with preloaded relations
func (r *outletRepository) GetByID(ctx context.Context, id string) (*models.Outlet, error) {
	var outlet models.Outlet
	err := r.db.WithContext(ctx).
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province").
		Preload("Manager").
		Preload("Company").
		First(&outlet, "outlets.id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &outlet, nil
}

// GetByCode retrieves an outlet by code
func (r *outletRepository) GetByCode(ctx context.Context, code string) (*models.Outlet, error) {
	var outlet models.Outlet
	err := r.db.WithContext(ctx).
		First(&outlet, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &outlet, nil
}

// GetNextCode generates the next sequential outlet code in OT-XXXXX format.
func (r *outletRepository) GetNextCode(ctx context.Context) (string, error) {
	var count int64
	if err := r.db.WithContext(ctx).Unscoped().Model(&models.Outlet{}).Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("OT-%05d", count+1), nil
}

// List retrieves outlets with pagination and filtering
func (r *outletRepository) List(ctx context.Context, params OutletListParams) ([]*models.Outlet, int64, error) {
	var outlets []*models.Outlet
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Outlet{})

	// Apply search filter
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR address ILIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	if params.CompanyID != "" {
		query = query.Where("company_id = ?", params.CompanyID)
	}

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting with whitelisted columns to prevent SQL injection.
	allowedSortColumns := map[string]string{
		"name":       "name",
		"code":       "code",
		"address":    "address",
		"created_at": "created_at",
		"updated_at": "updated_at",
		"is_active":  "is_active",
	}

	sortColumn := allowedSortColumns[strings.ToLower(strings.TrimSpace(params.SortBy))]
	if sortColumn == "" {
		sortColumn = "name"
	}

	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	isDesc := sortDir == "desc"

	query = query.Order(clause.OrderByColumn{Column: clause.Column{Name: "is_active"}, Desc: true})
	query = query.Order(clause.OrderByColumn{Column: clause.Column{Name: sortColumn}, Desc: isDesc})

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	// Preload relations
	query = query.
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province").
		Preload("Manager").
		Preload("Company")

	if err := query.Find(&outlets).Error; err != nil {
		return nil, 0, err
	}

	return outlets, total, nil
}

// Update updates an existing outlet
func (r *outletRepository) Update(ctx context.Context, outlet *models.Outlet) error {
	return r.db.WithContext(ctx).Save(outlet).Error
}

// Delete soft deletes an outlet
func (r *outletRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Outlet{}, "id = ?", id).Error
}
