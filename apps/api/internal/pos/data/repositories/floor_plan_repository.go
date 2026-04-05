package repositories

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/pos/data/models"
)

// FloorPlanListParams for list query filtering
type FloorPlanListParams struct {
	CompanyID string
	Search    string
	Status    string
	SortBy    string
	SortDir   string
	Limit     int
	Offset    int
}

// FloorPlanRepository defines data access operations
type FloorPlanRepository interface {
	Create(ctx context.Context, plan *models.FloorPlan) error
	FindByID(ctx context.Context, id string) (*models.FloorPlan, error)
	List(ctx context.Context, params FloorPlanListParams) ([]models.FloorPlan, int64, error)
	Update(ctx context.Context, plan *models.FloorPlan) error
	Delete(ctx context.Context, id string) error
	CreateVersion(ctx context.Context, version *models.LayoutVersion) error
	ListVersions(ctx context.Context, floorPlanID string) ([]models.LayoutVersion, error)
	GetVersion(ctx context.Context, versionID string) (*models.LayoutVersion, error)
}

type floorPlanRepository struct {
	db *gorm.DB
}

// NewFloorPlanRepository creates a new instance
func NewFloorPlanRepository(db *gorm.DB) FloorPlanRepository {
	return &floorPlanRepository{db: db}
}

func (r *floorPlanRepository) Create(ctx context.Context, plan *models.FloorPlan) error {
	return r.db.WithContext(ctx).Create(plan).Error
}

func (r *floorPlanRepository) FindByID(ctx context.Context, id string) (*models.FloorPlan, error) {
	var plan models.FloorPlan
	err := r.db.WithContext(ctx).First(&plan, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *floorPlanRepository) List(ctx context.Context, params FloorPlanListParams) ([]models.FloorPlan, int64, error) {
	var plans []models.FloorPlan
	var total int64
	query := r.db.WithContext(ctx).Model(&models.FloorPlan{})

	// Company-level filtering (RBAC scoping)
	if params.CompanyID != "" {
		query = query.Where("company_id = ?", params.CompanyID)
	}

	// Prefix search for index usage
	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("name ILIKE ?", search)
	}

	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting - validate column to prevent SQL injection
	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "floor_number"
	}
	sortDir := params.SortDir
	if sortDir == "" {
		sortDir = "asc"
	}

	allowedSorts := map[string]bool{
		"name": true, "floor_number": true, "created_at": true,
		"updated_at": true, "status": true, "version": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "floor_number"
	}
	if sortDir != "asc" && sortDir != "desc" {
		sortDir = "asc"
	}
	query = query.Order(fmt.Sprintf("%s %s", sortBy, sortDir))

	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	if err := query.Find(&plans).Error; err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

func (r *floorPlanRepository) Update(ctx context.Context, plan *models.FloorPlan) error {
	return r.db.WithContext(ctx).Save(plan).Error
}

func (r *floorPlanRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.FloorPlan{}, "id = ?", id).Error
}

func (r *floorPlanRepository) CreateVersion(ctx context.Context, version *models.LayoutVersion) error {
	return r.db.WithContext(ctx).Create(version).Error
}

func (r *floorPlanRepository) ListVersions(ctx context.Context, floorPlanID string) ([]models.LayoutVersion, error) {
	var versions []models.LayoutVersion
	err := r.db.WithContext(ctx).
		Where("floor_plan_id = ?", floorPlanID).
		Order("version DESC").
		Find(&versions).Error
	return versions, err
}

func (r *floorPlanRepository) GetVersion(ctx context.Context, versionID string) (*models.LayoutVersion, error) {
	var version models.LayoutVersion
	err := r.db.WithContext(ctx).First(&version, "id = ?", versionID).Error
	if err != nil {
		return nil, err
	}
	return &version, nil
}
