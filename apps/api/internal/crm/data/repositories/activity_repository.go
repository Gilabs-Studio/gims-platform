package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// ActivityListParams defines filters for listing activities
type ActivityListParams struct {
	Search         string
	SortBy         string
	SortDir        string
	Limit          int
	Offset         int
	Type           string
	ActivityTypeID string
	CustomerID     string
	ContactID      string
	DealID         string
	LeadID         string
	EmployeeID     string
	DateFrom       string
	DateTo         string
}

// ActivityRepository defines data access for CRM activities
type ActivityRepository interface {
	Create(ctx context.Context, activity *models.Activity) error
	FindByID(ctx context.Context, id string) (*models.Activity, error)
	List(ctx context.Context, params ActivityListParams) ([]models.Activity, int64, error)
	Timeline(ctx context.Context, params ActivityListParams) ([]models.Activity, int64, error)
}

type activityRepository struct {
	db *gorm.DB
}

// NewActivityRepository creates a new activity repository
func NewActivityRepository(db *gorm.DB) ActivityRepository {
	return &activityRepository{db: db}
}

func (r *activityRepository) Create(ctx context.Context, activity *models.Activity) error {
	return r.db.WithContext(ctx).Create(activity).Error
}

func (r *activityRepository) FindByID(ctx context.Context, id string) (*models.Activity, error) {
	var activity models.Activity
	err := r.db.WithContext(ctx).
		Preload("ActivityType").
		Preload("Employee").
		First(&activity, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &activity, nil
}

func (r *activityRepository) List(ctx context.Context, params ActivityListParams) ([]models.Activity, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Activity{})
	query = security.ApplyScopeFilter(query, ctx, security.MixedOwnershipScopeQueryOptions("employee_id"))

	query = r.applyFilters(query, params)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy, sortDir := "timestamp", "DESC"
	allowedSorts := map[string]bool{
		"timestamp": true, "type": true, "created_at": true,
	}
	if params.SortBy != "" && allowedSorts[params.SortBy] {
		sortBy = params.SortBy
	}
	if params.SortDir != "" && (strings.EqualFold(params.SortDir, "ASC") || strings.EqualFold(params.SortDir, "DESC")) {
		sortDir = strings.ToUpper(params.SortDir)
	}

	var activities []models.Activity
	err := query.
		Preload("ActivityType").
		Preload("Employee").
		Order(fmt.Sprintf("%s %s", sortBy, sortDir)).
		Limit(params.Limit).Offset(params.Offset).
		Find(&activities).Error
	return activities, total, err
}

// Timeline returns activities in chronological order (most recent first)
func (r *activityRepository) Timeline(ctx context.Context, params ActivityListParams) ([]models.Activity, int64, error) {
	params.SortBy = "timestamp"
	params.SortDir = "DESC"
	return r.List(ctx, params)
}

func (r *activityRepository) applyFilters(query *gorm.DB, params ActivityListParams) *gorm.DB {
	if params.Search != "" {
		searchTerm := params.Search + "%"
		query = query.Where("description ILIKE ?", searchTerm)
	}
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}
	if params.ActivityTypeID != "" {
		query = query.Where("activity_type_id = ?", params.ActivityTypeID)
	}
	if params.CustomerID != "" {
		query = query.Where("customer_id = ?", params.CustomerID)
	}
	if params.ContactID != "" {
		query = query.Where("contact_id = ?", params.ContactID)
	}
	// When both DealID and LeadID are provided, use OR so that activities linked
	// to either the deal or its source lead are returned together (cross-linked timeline).
	if params.DealID != "" && params.LeadID != "" {
		query = query.Where("(deal_id = ? OR lead_id = ?)", params.DealID, params.LeadID)
	} else if params.DealID != "" {
		query = query.Where("deal_id = ?", params.DealID)
	} else if params.LeadID != "" {
		query = query.Where("lead_id = ?", params.LeadID)
	}
	if params.EmployeeID != "" {
		query = query.Where("employee_id = ?", params.EmployeeID)
	}
	if params.DateFrom != "" {
		query = query.Where("timestamp >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("timestamp <= ?", params.DateTo+" 23:59:59")
	}
	return query
}
