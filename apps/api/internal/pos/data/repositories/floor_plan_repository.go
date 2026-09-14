package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/infrastructure/security"

	"gorm.io/gorm"

	"github.com/gilabs/gims/api/internal/pos/data/models"
)

// FloorPlanListParams for list query filtering
type FloorPlanListParams struct {
	OutletID  string
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
	return database.GetDB(ctx, r.db).Create(plan).Error
}

func (r *floorPlanRepository) FindByID(ctx context.Context, id string) (*models.FloorPlan, error) {
	var plan models.FloorPlan
	err := database.GetDB(ctx, r.db).
		Table("pos_floor_plans").
		Select("pos_floor_plans.*, COALESCE(outlets.name, '') AS outlet_name").
		Joins("LEFT JOIN outlets ON outlets.id = pos_floor_plans.outlet_id").
		Where("pos_floor_plans.id = ?", id).
		First(&plan).Error
	if err != nil {
		return nil, err
	}
	return &plan, nil
}

func (r *floorPlanRepository) List(ctx context.Context, params FloorPlanListParams) ([]models.FloorPlan, int64, error) {
	var plans []models.FloorPlan
	var total int64
	query := r.db.WithContext(ctx).
		Table("pos_floor_plans").
		Select("pos_floor_plans.*, COALESCE(outlets.name, '') AS outlet_name").
		Joins("LEFT JOIN outlets ON outlets.id = pos_floor_plans.outlet_id")

	// Apply dynamic scope filter
	query = security.ApplyScopeFilter(query, ctx, security.ScopeQueryOptions{
		OutletIDColumn: "pos_floor_plans.outlet_id",
	})

	// Company-level filtering (RBAC scoping)
	if params.OutletID != "" {
		query = query.Where("pos_floor_plans.outlet_id = ?", params.OutletID)
	}

	if params.CompanyID != "" {
		query = query.Where("outlets.company_id = ?", params.CompanyID)
	}

	// Prefix search on outlet name
	if params.Search != "" {
		search := params.Search + "%"
		query = query.Where("outlets.name ILIKE ?", search)
	}

	if params.Status != "" {
		query = query.Where("pos_floor_plans.status = ?", params.Status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting with whitelist
	allowedSortColumns := map[string]string{
		"name":         "outlets.name",
		"floor_number": "pos_floor_plans.floor_number",
		"created_at":   "pos_floor_plans.created_at",
		"updated_at":   "pos_floor_plans.updated_at",
		"status":       "pos_floor_plans.status",
		"version":      "pos_floor_plans.version",
	}

	sortColumn := allowedSortColumns[strings.ToLower(strings.TrimSpace(params.SortBy))]
	if sortColumn == "" {
		sortColumn = "pos_floor_plans.floor_number"
	}

	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	orderClause := sortColumn + " ASC"
	if sortDir == "desc" {
		orderClause = sortColumn + " DESC"
	}
	query = query.Order(orderClause)

	if params.Limit > 0 {
		query = query.Limit(params.Limit).Offset(params.Offset)
	}

	if err := query.Find(&plans).Error; err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

func (r *floorPlanRepository) Update(ctx context.Context, plan *models.FloorPlan) error {
	return database.GetDB(ctx, r.db).Save(plan).Error
}

func (r *floorPlanRepository) Delete(ctx context.Context, id string) error {
	return database.GetDB(ctx, r.db).Delete(&models.FloorPlan{}, "id = ?", id).Error
}

func (r *floorPlanRepository) CreateVersion(ctx context.Context, version *models.LayoutVersion) error {
	return database.GetDB(ctx, r.db).Create(version).Error
}

func (r *floorPlanRepository) ListVersions(ctx context.Context, floorPlanID string) ([]models.LayoutVersion, error) {
	var versions []models.LayoutVersion
	err := database.GetDB(ctx, r.db).
		Select(`pos_layout_versions.*, COALESCE((
			SELECT u.name
			FROM users u
			WHERE u.id::text = pos_layout_versions.published_by
			AND u.tenant_id = pos_layout_versions.tenant_id
			LIMIT 1
		), '') AS published_by_name`).
		Where("pos_layout_versions.floor_plan_id = ?", floorPlanID).
		Order("pos_layout_versions.version DESC").
		Find(&versions).Error
	return versions, err
}

func (r *floorPlanRepository) GetVersion(ctx context.Context, versionID string) (*models.LayoutVersion, error) {
	var version models.LayoutVersion
	err := database.GetDB(ctx, r.db).First(&version, "id = ?", versionID).Error
	if err != nil {
		return nil, err
	}
	return &version, nil
}
