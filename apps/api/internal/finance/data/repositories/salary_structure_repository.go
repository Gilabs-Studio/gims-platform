package repositories

import (
	"context"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/security"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type SalaryStructureListParams struct {
	Search     string
	EmployeeID *string
	Status     *financeModels.SalaryStructureStatus
	Limit      int
	Offset     int
	SortBy     string
	SortDir    string
}

type SalaryStructureStatsResult struct {
	Total              int64
	Active             int64
	Draft              int64
	Inactive           int64
	AverageSalary      float64
	MinSalary          float64
	MaxSalary          float64
	TotalSalaryOverTime []SalaryStructureTotalSalaryOverTime
}

type SalaryStructureTotalSalaryOverTime struct {
	Period      time.Time `gorm:"column:period"`
	TotalSalary float64   `gorm:"column:total_salary"`
}

type SalaryStructureRepository interface {
	FindByID(ctx context.Context, id string) (*financeModels.SalaryStructure, error)
	List(ctx context.Context, params SalaryStructureListParams) ([]financeModels.SalaryStructure, int64, error)
	GetActiveByEmployeeID(ctx context.Context, employeeID string) (*financeModels.SalaryStructure, error)
	DeactivateAllByEmployeeID(ctx context.Context, tx *gorm.DB, employeeID string) error
	UpdateStatus(ctx context.Context, id string, status financeModels.SalaryStructureStatus) error
	GetStats(ctx context.Context) (*SalaryStructureStatsResult, error)
}

type salaryStructureRepository struct {
	db *gorm.DB
}

func NewSalaryStructureRepository(db *gorm.DB) SalaryStructureRepository {
	return &salaryStructureRepository{db: db}
}

func (r *salaryStructureRepository) FindByID(ctx context.Context, id string) (*financeModels.SalaryStructure, error) {
	var item financeModels.SalaryStructure
	if err := r.db.WithContext(ctx).
		Preload("Employee").
		Preload("Employee.User").
		First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *salaryStructureRepository) GetActiveByEmployeeID(ctx context.Context, employeeID string) (*financeModels.SalaryStructure, error) {
	var item financeModels.SalaryStructure
	if err := r.db.WithContext(ctx).
		Preload("Employee").
		Preload("Employee.User").
		Where("employee_id = ? AND status = ?", employeeID, financeModels.SalaryStructureStatusActive).
		First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *salaryStructureRepository) DeactivateAllByEmployeeID(ctx context.Context, tx *gorm.DB, employeeID string) error {
	return tx.WithContext(ctx).Model(&financeModels.SalaryStructure{}).
		Where("employee_id = ? AND status = ?", employeeID, financeModels.SalaryStructureStatusActive).
		Update("status", financeModels.SalaryStructureStatusInactive).Error
}

func (r *salaryStructureRepository) UpdateStatus(ctx context.Context, id string, status financeModels.SalaryStructureStatus) error {
	return r.db.WithContext(ctx).
		Model(&financeModels.SalaryStructure{}).
		Where("id = ?", id).
		Update("status", status).Error
}

func (r *salaryStructureRepository) List(ctx context.Context, params SalaryStructureListParams) ([]financeModels.SalaryStructure, int64, error) {
	var items []financeModels.SalaryStructure
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.SalaryStructure{})
	q = security.ApplyScopeFilter(q, ctx, security.MixedOwnershipScopeQueryOptions("employee_id"))

	if params.EmployeeID != nil {
		q = q.Where("employee_id = ?", *params.EmployeeID)
	}
	if params.Status != nil {
		q = q.Where("status = ?", *params.Status)
	}
	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		// Join employees for name search
		q = q.Joins("LEFT JOIN employees ON employees.id = salary_structures.employee_id").
			Where("employees.name ILIKE ? OR salary_structures.notes ILIKE ?", like, like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := "salary_structures.effective_date"
	if params.SortBy != "" {
		sortCol = params.SortBy
	}
	sortDir := "DESC"
	if strings.ToUpper(params.SortDir) == "ASC" {
		sortDir = "ASC"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
		q = q.Offset(params.Offset)
	}

	if err := q.Preload("Employee").Preload("Employee.User").Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *salaryStructureRepository) GetStats(ctx context.Context) (*SalaryStructureStatsResult, error) {
	var result SalaryStructureStatsResult

	type countResult struct {
		Status string
		Count  int64
	}

	var counts []countResult
	if err := r.db.WithContext(ctx).
		Model(&financeModels.SalaryStructure{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&counts).Error; err != nil {
		return nil, err
	}

	for _, c := range counts {
		result.Total += c.Count
		switch c.Status {
		case string(financeModels.SalaryStructureStatusActive):
			result.Active = c.Count
		case string(financeModels.SalaryStructureStatusDraft):
			result.Draft = c.Count
		case string(financeModels.SalaryStructureStatusInactive):
			result.Inactive = c.Count
		}
	}

	// Salary aggregates from active records
	type aggResult struct {
		Avg float64
		Min float64
		Max float64
	}
	var agg aggResult
	if err := r.db.WithContext(ctx).
		Model(&financeModels.SalaryStructure{}).
		Where("status = ?", financeModels.SalaryStructureStatusActive).
		Select("COALESCE(AVG(basic_salary), 0) as avg, COALESCE(MIN(basic_salary), 0) as min, COALESCE(MAX(basic_salary), 0) as max").
		Scan(&agg).Error; err != nil {
		return nil, err
	}
	result.AverageSalary = agg.Avg
	result.MinSalary = agg.Min
	result.MaxSalary = agg.Max

// Total salary over time (by month) for charting aggregated salary trends.
// This should reflect the sum of active employee salaries for each period,
// carrying forward the latest salary for each employee until a new salary record applies.
	var series []SalaryStructureTotalSalaryOverTime
	query := `
	SELECT period, COALESCE(SUM(basic_salary), 0) AS total_salary
	FROM (
	    SELECT
	        m.period,
	        s.employee_id,
	        s.basic_salary,
	        ROW_NUMBER() OVER (PARTITION BY m.period, s.employee_id ORDER BY s.effective_date DESC) AS rn
	    FROM (
	        SELECT generate_series(
	            (SELECT COALESCE(MIN(date_trunc('month', effective_date)), date_trunc('month', CURRENT_DATE))
	                FROM salary_structures
	                WHERE status != 'draft'
	            ),
	            date_trunc('month', CURRENT_DATE),
	            INTERVAL '1 month'
	        ) AS period
	    ) m
	    JOIN salary_structures s
	        ON s.effective_date <= (m.period + INTERVAL '1 month' - INTERVAL '1 day')
	        AND s.status != 'draft'
	        AND (
	            s.status = 'active'
	            OR (s.status = 'inactive' AND date_trunc('month', s.updated_at) > m.period)
	        )
	) history
	WHERE rn = 1
	GROUP BY period
	ORDER BY period;
	`
	t := r.db.WithContext(ctx).Raw(query).Scan(&series)
	if t.Error != nil {
		return nil, t.Error
	}
	result.TotalSalaryOverTime = series

	return &result, nil
}
