package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/internal/crm/data/models"
	"gorm.io/gorm"
)

// ScheduleListParams defines filters for listing schedules
type ScheduleListParams struct {
	Search     string
	SortBy     string
	SortDir    string
	Limit      int
	Offset     int
	EmployeeID string
	Status     string
	DateFrom   string
	DateTo     string
	TaskID     string
}

// ScheduleRepository defines data access for CRM schedules
type ScheduleRepository interface {
	Create(ctx context.Context, schedule *models.Schedule) error
	FindByID(ctx context.Context, id string) (*models.Schedule, error)
	List(ctx context.Context, params ScheduleListParams) ([]models.Schedule, int64, error)
	Update(ctx context.Context, schedule *models.Schedule) error
	Delete(ctx context.Context, id string) error
}

type scheduleRepository struct {
	db *gorm.DB
}

// NewScheduleRepository creates a new schedule repository
func NewScheduleRepository(db *gorm.DB) ScheduleRepository {
	return &scheduleRepository{db: db}
}

func (r *scheduleRepository) Create(ctx context.Context, schedule *models.Schedule) error {
	return r.db.WithContext(ctx).Create(schedule).Error
}

func (r *scheduleRepository) FindByID(ctx context.Context, id string) (*models.Schedule, error) {
	var schedule models.Schedule
	err := r.db.WithContext(ctx).
		Preload("Task").
		Preload("Employee").
		First(&schedule, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}

func (r *scheduleRepository) List(ctx context.Context, params ScheduleListParams) ([]models.Schedule, int64, error) {
	query := r.db.WithContext(ctx).Model(&models.Schedule{})

	if params.Search != "" {
		searchTerm := params.Search + "%"
		query = query.Where("title ILIKE ? OR description ILIKE ?", searchTerm, searchTerm)
	}
	if params.EmployeeID != "" {
		query = query.Where("employee_id = ?", params.EmployeeID)
	}
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.TaskID != "" {
		query = query.Where("task_id = ?", params.TaskID)
	}
	if params.DateFrom != "" {
		query = query.Where("scheduled_at >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("scheduled_at <= ?", params.DateTo+" 23:59:59")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortBy, sortDir := "scheduled_at", "ASC"
	allowedSorts := map[string]bool{
		"scheduled_at": true, "title": true, "status": true,
		"created_at": true, "updated_at": true,
	}
	if params.SortBy != "" && allowedSorts[params.SortBy] {
		sortBy = params.SortBy
	}
	if params.SortDir != "" && (strings.EqualFold(params.SortDir, "ASC") || strings.EqualFold(params.SortDir, "DESC")) {
		sortDir = strings.ToUpper(params.SortDir)
	}

	var schedules []models.Schedule
	err := query.
		Preload("Task").
		Preload("Employee").
		Order(fmt.Sprintf("%s %s", sortBy, sortDir)).
		Limit(params.Limit).Offset(params.Offset).
		Find(&schedules).Error
	return schedules, total, err
}

func (r *scheduleRepository) Update(ctx context.Context, schedule *models.Schedule) error {
	return r.db.WithContext(ctx).Save(schedule).Error
}

func (r *scheduleRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Schedule{}).Error
}
