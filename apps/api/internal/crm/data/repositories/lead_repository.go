package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// LeadListParams defines filtering/sorting/pagination parameters for lead queries
type LeadListParams struct {
	Search       string
	SortBy       string
	SortDir      string
	Limit        int
	Offset       int
	LeadStatusID string
	LeadSourceID string
	AssignedTo   string
	ScoreMin     *int
	ScoreMax     *int
	DateFrom     string
	DateTo       string
	IsConverted  *bool
}

// LeadRepository defines data access methods for leads
type LeadRepository interface {
	Create(ctx context.Context, lead *models.Lead) error
	FindByID(ctx context.Context, id string) (*models.Lead, error)
	FindByEmail(ctx context.Context, email string) (*models.Lead, error)
	FindDuplicate(ctx context.Context, email, phone, companyName, placeID, cid string) (*models.Lead, error)
	List(ctx context.Context, params LeadListParams) ([]models.Lead, int64, error)
	Update(ctx context.Context, lead *models.Lead) error
	Delete(ctx context.Context, id string) error
	ExistsByCode(ctx context.Context, code string) (bool, error)
	GetAnalytics(ctx context.Context) (*LeadAnalytics, error)
}

// LeadAnalytics holds aggregated lead statistics
type LeadAnalytics struct {
	TotalLeads     int64                `json:"total_leads"`
	ByStatus       []LeadCountByField   `json:"by_status"`
	BySource       []LeadCountByField   `json:"by_source"`
	ConversionRate float64              `json:"conversion_rate"`
	AvgScore       float64              `json:"avg_score"`
}

// LeadCountByField holds count grouped by a field
type LeadCountByField struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color,omitempty"`
	Count int64  `json:"count"`
}

type leadRepository struct {
	db *gorm.DB
}

// NewLeadRepository creates a new lead repository instance
func NewLeadRepository(db *gorm.DB) LeadRepository {
	return &leadRepository{db: db}
}

func (r *leadRepository) Create(ctx context.Context, lead *models.Lead) error {
	return r.db.WithContext(ctx).Create(lead).Error
}

func (r *leadRepository) FindByID(ctx context.Context, id string) (*models.Lead, error) {
	var lead models.Lead
	err := r.db.WithContext(ctx).
		Preload("LeadSource").
		Preload("LeadStatus").
		Preload("AssignedEmployee").
		Preload("Customer").
		Preload("Contact").
		Preload("BusinessType").
		Preload("Area").
		Preload("Deal").
		Preload("Deal.PipelineStage").
		Preload("Activities", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(50)
		}).
		Preload("Activities.ActivityType").
		Preload("Activities.Employee").
		Preload("Tasks", func(db *gorm.DB) *gorm.DB {
			return db.Order("CASE WHEN status IN ('pending','in_progress') THEN 0 ELSE 1 END, due_date ASC NULLS LAST").Limit(20)
		}).
		Preload("Tasks.AssignedEmployee").
		First(&lead, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

// FindByEmail looks up an unconverted lead by email
func (r *leadRepository) FindByEmail(ctx context.Context, email string) (*models.Lead, error) {
	var lead models.Lead
	err := r.db.WithContext(ctx).
		Preload("LeadSource").
		Preload("LeadStatus").
		Preload("AssignedEmployee").
		Where("email = ? AND converted_at IS NULL", email).
		First(&lead).Error
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

// FindDuplicate looks up an unconverted lead by either place_id, cid, email, phone, or company name for deduplication during upsert
func (r *leadRepository) FindDuplicate(ctx context.Context, email, phone, companyName, placeID, cid string) (*models.Lead, error) {
	var lead models.Lead
	query := r.db.WithContext(ctx).
		Preload("LeadSource").
		Preload("LeadStatus").
		Preload("AssignedEmployee").
		Where("converted_at IS NULL")

	if placeID != "" {
		query = query.Where("place_id = ?", placeID)
	} else if cid != "" {
		query = query.Where("cid = ?", cid)
	} else if email != "" {
		query = query.Where("email = ?", email)
	} else if phone != "" {
		query = query.Where("phone = ?", phone)
	} else if companyName != "" && !strings.EqualFold(companyName, "Unknown Company") && !strings.EqualFold(companyName, "N/A") {
		query = query.Where("company_name = ?", companyName)
	} else {
		// Nothing to match against
		return nil, gorm.ErrRecordNotFound
	}

	err := query.First(&lead).Error
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

func (r *leadRepository) List(ctx context.Context, params LeadListParams) ([]models.Lead, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Lead{})

	// Search filter (prefix search for indexed columns)
	if params.Search != "" {
		searchTerm := params.Search + "%"
		query = query.Where(
			"first_name ILIKE ? OR last_name ILIKE ? OR company_name ILIKE ? OR code ILIKE ? OR email ILIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
		)
	}

	// Status filter
	if params.LeadStatusID != "" {
		query = query.Where("lead_status_id = ?", params.LeadStatusID)
	}

	// Source filter
	if params.LeadSourceID != "" {
		query = query.Where("lead_source_id = ?", params.LeadSourceID)
	}

	// Assignment filter
	if params.AssignedTo != "" {
		query = query.Where("assigned_to = ?", params.AssignedTo)
	}

	// Score range filter
	if params.ScoreMin != nil {
		query = query.Where("lead_score >= ?", *params.ScoreMin)
	}
	if params.ScoreMax != nil {
		query = query.Where("lead_score <= ?", *params.ScoreMax)
	}

	// Date range filter
	if params.DateFrom != "" {
		query = query.Where("created_at >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("created_at <= ?", params.DateTo+" 23:59:59")
	}

	// Conversion filter
	if params.IsConverted != nil {
		if *params.IsConverted {
			query = query.Where("converted_at IS NOT NULL")
		} else {
			query = query.Where("converted_at IS NULL")
		}
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	sortBy := "created_at"
	sortDir := "DESC"
	allowedSorts := map[string]bool{
		"code": true, "first_name": true, "last_name": true, "company_name": true,
		"lead_score": true, "probability": true, "estimated_value": true,
		"created_at": true, "updated_at": true,
	}
	if params.SortBy != "" && allowedSorts[params.SortBy] {
		sortBy = params.SortBy
	}
	if params.SortDir != "" && (strings.EqualFold(params.SortDir, "ASC") || strings.EqualFold(params.SortDir, "DESC")) {
		sortDir = strings.ToUpper(params.SortDir)
	}

	var leads []models.Lead
	err := query.
		Preload("LeadSource").
		Preload("LeadStatus").
		Preload("AssignedEmployee").
		Order(fmt.Sprintf("%s %s", sortBy, sortDir)).
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&leads).Error

	return leads, total, err
}

func (r *leadRepository) Update(ctx context.Context, lead *models.Lead) error {
	return r.db.WithContext(ctx).Save(lead).Error
}

func (r *leadRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Lead{}).Error
}

func (r *leadRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Lead{}).Where("code = ?", code).Count(&count).Error
	return count > 0, err
}

func (r *leadRepository) GetAnalytics(ctx context.Context) (*LeadAnalytics, error) {
	analytics := &LeadAnalytics{}

	// Total leads
	r.db.WithContext(ctx).Model(&models.Lead{}).Count(&analytics.TotalLeads)

	// By status
	r.db.WithContext(ctx).
		Table("crm_leads").
		Select("crm_lead_statuses.id, crm_lead_statuses.name, crm_lead_statuses.color, COUNT(*) as count").
		Joins("LEFT JOIN crm_lead_statuses ON crm_leads.lead_status_id = crm_lead_statuses.id").
		Where("crm_leads.deleted_at IS NULL").
		Group("crm_lead_statuses.id, crm_lead_statuses.name, crm_lead_statuses.color").
		Scan(&analytics.ByStatus)

	// By source
	r.db.WithContext(ctx).
		Table("crm_leads").
		Select("crm_lead_sources.id, crm_lead_sources.name, COUNT(*) as count").
		Joins("LEFT JOIN crm_lead_sources ON crm_leads.lead_source_id = crm_lead_sources.id").
		Where("crm_leads.deleted_at IS NULL").
		Group("crm_lead_sources.id, crm_lead_sources.name").
		Scan(&analytics.BySource)

	// Conversion rate
	var convertedCount int64
	r.db.WithContext(ctx).Model(&models.Lead{}).Where("converted_at IS NOT NULL").Count(&convertedCount)
	if analytics.TotalLeads > 0 {
		analytics.ConversionRate = float64(convertedCount) / float64(analytics.TotalLeads) * 100
	}

	// Average score
	r.db.WithContext(ctx).Model(&models.Lead{}).Select("COALESCE(AVG(lead_score), 0)").Scan(&analytics.AvgScore)

	return analytics, nil
}
