package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// DealListParams defines filtering/sorting/pagination parameters for deal queries
type DealListParams struct {
	Search          string
	SortBy          string
	SortDir         string
	Limit           int
	Offset          int
	Status          string
	PipelineStageID string
	CustomerID      string
	AssignedTo      string
	LeadID          string
	DateFrom        string
	DateTo          string
}

// DealsByStageParams defines parameters for the Kanban board view
type DealsByStageParams struct {
	StageID string
	Limit   int
	Offset  int
	Search  string
	Status  string
}

// StageSummary holds aggregated stage statistics for pipeline summary
type StageSummary struct {
	StageID    string  `json:"stage_id"`
	StageName  string  `json:"stage_name"`
	StageColor string  `json:"stage_color"`
	StageOrder int     `json:"stage_order"`
	DealCount  int64   `json:"deal_count"`
	TotalValue float64 `json:"total_value"`
}

// PipelineSummaryData holds the complete pipeline summary
type PipelineSummaryData struct {
	TotalDeals int64          `json:"total_deals"`
	TotalValue float64        `json:"total_value"`
	OpenDeals  int64          `json:"open_deals"`
	OpenValue  float64        `json:"open_value"`
	WonDeals   int64          `json:"won_deals"`
	WonValue   float64        `json:"won_value"`
	LostDeals  int64          `json:"lost_deals"`
	LostValue  float64        `json:"lost_value"`
	ByStage    []StageSummary `json:"by_stage"`
}

// ForecastData holds weighted deal forecast
type ForecastData struct {
	TotalWeightedValue float64         `json:"total_weighted_value"`
	TotalDeals         int64           `json:"total_deals"`
	ByStage            []StageForecast `json:"by_stage"`
}

// StageForecast holds forecast per stage
type StageForecast struct {
	StageID       string  `json:"stage_id"`
	StageName     string  `json:"stage_name"`
	DealCount     int64   `json:"deal_count"`
	TotalValue    float64 `json:"total_value"`
	Probability   int     `json:"probability"`
	WeightedValue float64 `json:"weighted_value"`
}

// DealRepository defines data access methods for deals
type DealRepository interface {
	Create(ctx context.Context, deal *models.Deal) error
	FindByID(ctx context.Context, id string) (*models.Deal, error)
	List(ctx context.Context, params DealListParams) ([]models.Deal, int64, error)
	ListByStage(ctx context.Context, params DealsByStageParams) ([]models.Deal, int64, error)
	Update(ctx context.Context, deal *models.Deal) error
	Delete(ctx context.Context, id string) error
	CreateHistory(ctx context.Context, history *models.DealHistory) error
	GetHistory(ctx context.Context, dealID string) ([]models.DealHistory, error)
	GetPipelineSummary(ctx context.Context) (*PipelineSummaryData, error)
	GetForecast(ctx context.Context) (*ForecastData, error)
	DeleteItemsByDealID(ctx context.Context, dealID string) error
	CreateItems(ctx context.Context, items []models.DealProductItem) error
	SoftDeleteItemByID(ctx context.Context, itemID, dealID string) error
	RestoreItemByID(ctx context.Context, itemID, dealID string) error
	GetLastHistoryByDealID(ctx context.Context, dealID string) (*models.DealHistory, error)
}

type dealRepository struct {
	db *gorm.DB
}

// NewDealRepository creates a new deal repository instance
func NewDealRepository(db *gorm.DB) DealRepository {
	return &dealRepository{db: db}
}

func (r *dealRepository) Create(ctx context.Context, deal *models.Deal) error {
	return r.db.WithContext(ctx).Create(deal).Error
}

func (r *dealRepository) FindByID(ctx context.Context, id string) (*models.Deal, error) {
	var deal models.Deal
	err := r.db.WithContext(ctx).
		Preload("PipelineStage").
		Preload("Customer").
		Preload("Contact").
		Preload("AssignedEmployee").
		Preload("Lead").
		Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Unscoped().Order("created_at ASC") }).
		Preload("Items.Product").
		Preload("Tasks", func(db *gorm.DB) *gorm.DB {
			return db.Order("CASE WHEN status IN ('pending','in_progress') THEN 0 ELSE 1 END, due_date ASC NULLS LAST").Limit(20)
		}).
		Preload("Tasks.AssignedEmployee").
		First(&deal, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &deal, nil
}

func (r *dealRepository) List(ctx context.Context, params DealListParams) ([]models.Deal, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Deal{})

	// Search filter (prefix search for indexed columns)
	if params.Search != "" {
		searchTerm := params.Search + "%"
		query = query.Where(
			"title ILIKE ? OR code ILIKE ?",
			searchTerm, searchTerm,
		)
	}

	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.PipelineStageID != "" {
		query = query.Where("pipeline_stage_id = ?", params.PipelineStageID)
	}
	if params.CustomerID != "" {
		query = query.Where("customer_id = ?", params.CustomerID)
	}
	if params.AssignedTo != "" {
		query = query.Where("assigned_to = ?", params.AssignedTo)
	}
	if params.LeadID != "" {
		query = query.Where("lead_id = ?", params.LeadID)
	}
	if params.DateFrom != "" {
		query = query.Where("created_at >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("created_at <= ?", params.DateTo+" 23:59:59")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	sortBy := "created_at"
	sortDir := "DESC"
	allowedSorts := map[string]bool{
		"code": true, "title": true, "value": true, "probability": true,
		"status": true, "created_at": true, "updated_at": true, "expected_close_date": true,
	}
	if params.SortBy != "" && allowedSorts[params.SortBy] {
		sortBy = params.SortBy
	}
	if params.SortDir != "" && (strings.EqualFold(params.SortDir, "ASC") || strings.EqualFold(params.SortDir, "DESC")) {
		sortDir = strings.ToUpper(params.SortDir)
	}

	var deals []models.Deal
	err := query.
		Preload("PipelineStage").
		Preload("Customer").
		Preload("Contact").
		Preload("AssignedEmployee").
		Order(fmt.Sprintf("%s %s", sortBy, sortDir)).
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&deals).Error

	return deals, total, err
}

func (r *dealRepository) ListByStage(ctx context.Context, params DealsByStageParams) ([]models.Deal, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Deal{}).Where("pipeline_stage_id = ?", params.StageID)

	if params.Search != "" {
		searchTerm := params.Search + "%"
		query = query.Where("title ILIKE ? OR code ILIKE ?", searchTerm, searchTerm)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var deals []models.Deal
	err := query.
		Preload("PipelineStage").
		Preload("Customer").
		Preload("Contact").
		Preload("AssignedEmployee").
		Preload("Items").
		Order("updated_at DESC").
		Limit(params.Limit).
		Offset(params.Offset).
		Find(&deals).Error

	return deals, total, err
}

func (r *dealRepository) Update(ctx context.Context, deal *models.Deal) error {
	// Use explicit Select to only update scalar/FK columns, bypassing GORM association
	// handling entirely. This prevents BelongsTo callbacks from overriding FK values.
	return r.db.WithContext(ctx).
		Select(
			"pipeline_stage_id", "title", "description", "status",
			"value", "probability",
			"expected_close_date", "actual_close_date", "close_reason",
			"customer_id", "contact_id", "assigned_to", "bank_account_reference",
			"budget_confirmed", "budget_amount",
			"auth_confirmed", "auth_person",
			"need_confirmed", "need_description",
			"time_confirmed", "notes",
			"converted_to_quotation_id", "converted_at",
		).
		Save(deal).Error
}

func (r *dealRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Deal{}).Error
}

func (r *dealRepository) CreateHistory(ctx context.Context, history *models.DealHistory) error {
	return r.db.WithContext(ctx).Create(history).Error
}

func (r *dealRepository) GetHistory(ctx context.Context, dealID string) ([]models.DealHistory, error) {
	var history []models.DealHistory
	err := r.db.WithContext(ctx).
		Where("deal_id = ?", dealID).
		Preload("FromStage").
		Preload("ToStage").
		Preload("ChangedByEmployee").
		Order("changed_at DESC").
		Find(&history).Error
	return history, err
}

func (r *dealRepository) GetLastHistoryByDealID(ctx context.Context, dealID string) (*models.DealHistory, error) {
	var history models.DealHistory
	err := r.db.WithContext(ctx).
		Where("deal_id = ?", dealID).
		Order("changed_at DESC").
		First(&history).Error
	if err != nil {
		return nil, err
	}
	return &history, nil
}

func (r *dealRepository) DeleteItemsByDealID(ctx context.Context, dealID string) error {
	// Hard-delete previously soft-deleted items to prevent unbounded accumulation
	if err := r.db.Unscoped().WithContext(ctx).
		Where("deal_id = ? AND deleted_at IS NOT NULL", dealID).
		Delete(&models.DealProductItem{}).Error; err != nil {
		return err
	}
	// Soft-delete currently active items so they appear struck-through in the detail view
	return r.db.WithContext(ctx).Where("deal_id = ?", dealID).Delete(&models.DealProductItem{}).Error
}

func (r *dealRepository) CreateItems(ctx context.Context, items []models.DealProductItem) error {
	if len(items) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&items).Error
}

func (r *dealRepository) SoftDeleteItemByID(ctx context.Context, itemID, dealID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND deal_id = ?", itemID, dealID).Delete(&models.DealProductItem{}).Error
}

func (r *dealRepository) RestoreItemByID(ctx context.Context, itemID, dealID string) error {
	return r.db.Unscoped().WithContext(ctx).Model(&models.DealProductItem{}).
		Where("id = ? AND deal_id = ?", itemID, dealID).
		Update("deleted_at", nil).Error
}

func (r *dealRepository) GetPipelineSummary(ctx context.Context) (*PipelineSummaryData, error) {
	summary := &PipelineSummaryData{}

	// Total deals
	r.db.WithContext(ctx).Model(&models.Deal{}).Count(&summary.TotalDeals)
	r.db.WithContext(ctx).Model(&models.Deal{}).Select("COALESCE(SUM(value), 0)").Scan(&summary.TotalValue)

	// Open deals
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "open").Count(&summary.OpenDeals)
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "open").Select("COALESCE(SUM(value), 0)").Scan(&summary.OpenValue)

	// Won deals
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "won").Count(&summary.WonDeals)
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "won").Select("COALESCE(SUM(value), 0)").Scan(&summary.WonValue)

	// Lost deals
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "lost").Count(&summary.LostDeals)
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "lost").Select("COALESCE(SUM(value), 0)").Scan(&summary.LostValue)

	// By stage
	r.db.WithContext(ctx).
		Table("crm_deals").
		Select("crm_pipeline_stages.id as stage_id, crm_pipeline_stages.name as stage_name, crm_pipeline_stages.color as stage_color, crm_pipeline_stages.\"order\" as stage_order, COUNT(*) as deal_count, COALESCE(SUM(crm_deals.value), 0) as total_value").
		Joins("LEFT JOIN crm_pipeline_stages ON crm_deals.pipeline_stage_id = crm_pipeline_stages.id").
		Where("crm_deals.deleted_at IS NULL").
		Group("crm_pipeline_stages.id, crm_pipeline_stages.name, crm_pipeline_stages.color, crm_pipeline_stages.\"order\"").
		Order("crm_pipeline_stages.\"order\" ASC").
		Scan(&summary.ByStage)

	return summary, nil
}

func (r *dealRepository) GetForecast(ctx context.Context) (*ForecastData, error) {
	forecast := &ForecastData{}

	// Only open deals contribute to forecast
	r.db.WithContext(ctx).Model(&models.Deal{}).Where("status = ?", "open").Count(&forecast.TotalDeals)

	// Weighted value = sum(value * probability / 100)
	r.db.WithContext(ctx).Model(&models.Deal{}).
		Where("status = ?", "open").
		Select("COALESCE(SUM(value * probability / 100.0), 0)").
		Scan(&forecast.TotalWeightedValue)

	// By stage
	r.db.WithContext(ctx).
		Table("crm_deals").
		Select("crm_pipeline_stages.id as stage_id, crm_pipeline_stages.name as stage_name, COUNT(*) as deal_count, COALESCE(SUM(crm_deals.value), 0) as total_value, crm_pipeline_stages.probability, COALESCE(SUM(crm_deals.value * crm_deals.probability / 100.0), 0) as weighted_value").
		Joins("LEFT JOIN crm_pipeline_stages ON crm_deals.pipeline_stage_id = crm_pipeline_stages.id").
		Where("crm_deals.deleted_at IS NULL AND crm_deals.status = ?", "open").
		Group("crm_pipeline_stages.id, crm_pipeline_stages.name, crm_pipeline_stages.probability").
		Order("crm_pipeline_stages.probability ASC").
		Scan(&forecast.ByStage)

	return forecast, nil
}
