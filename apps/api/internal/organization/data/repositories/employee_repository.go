package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EmployeeListParams defines the parameters for listing employees
type EmployeeListParams struct {
	Page          int
	PerPage       int
	Search        string
	DivisionID    string
	JobPositionID string
	AreaID        string
	CompanyID     string
	Status        string
	IsActive      *bool
	SortBy        string
	SortDir       string
}

// EmployeeRepository defines the interface for employee data operations
type EmployeeRepository interface {
	Create(ctx context.Context, employee *models.Employee) error
	FindByID(ctx context.Context, id string) (*models.Employee, error)
	FindByCode(ctx context.Context, code string) (*models.Employee, error)
	FindByUserID(ctx context.Context, userID string) (*models.Employee, error)
	List(ctx context.Context, params EmployeeListParams) ([]models.Employee, int64, error)
	Update(ctx context.Context, employee *models.Employee) error
	Delete(ctx context.Context, id string) error
}

type employeeRepository struct {
	db *gorm.DB
}

// NewEmployeeRepository creates a new EmployeeRepository instance
func NewEmployeeRepository(db *gorm.DB) EmployeeRepository {
	return &employeeRepository{db: db}
}

func (r *employeeRepository) Create(ctx context.Context, employee *models.Employee) error {
	return r.db.WithContext(ctx).Create(employee).Error
}

func (r *employeeRepository) FindByID(ctx context.Context, id string) (*models.Employee, error) {
	var employee models.Employee
	err := r.db.WithContext(ctx).
		Preload("Division").
		Preload("JobPosition").
		Preload("Company").
		Preload("Village.District.City.Province").
		Preload("User").
		Preload("ReplacementFor").
		Preload("Areas.Area").
		First(&employee, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *employeeRepository) FindByCode(ctx context.Context, code string) (*models.Employee, error) {
	var employee models.Employee
	err := r.db.WithContext(ctx).
		Preload("Division").
		Preload("JobPosition").
		Preload("Company").
		First(&employee, "employee_code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *employeeRepository) FindByUserID(ctx context.Context, userID string) (*models.Employee, error) {
	var employee models.Employee
	err := r.db.WithContext(ctx).
		Preload("Division").
		Preload("JobPosition").
		Preload("Company").
		First(&employee, "user_id = ?", userID).Error
	if err != nil {
		return nil, err
	}
	return &employee, nil
}

func (r *employeeRepository) List(ctx context.Context, params EmployeeListParams) ([]models.Employee, int64, error) {
	var employees []models.Employee
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Employee{})

	// Apply search filter
	if params.Search != "" {
		searchPattern := "%" + params.Search + "%"
		query = query.Where(
			"name ILIKE ? OR employee_code ILIKE ? OR email ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	// Apply division filter
	if params.DivisionID != "" {
		query = query.Where("division_id = ?", params.DivisionID)
	}

	// Apply job position filter
	if params.JobPositionID != "" {
		query = query.Where("job_position_id = ?", params.JobPositionID)
	}

	// Apply company filter
	if params.CompanyID != "" {
		query = query.Where("company_id = ?", params.CompanyID)
	}

	// Apply status filter
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// Apply is_active filter
	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	// Apply area filter (via join)
	if params.AreaID != "" {
		query = query.Joins("INNER JOIN employee_areas ON employee_areas.employee_id = employees.id").
			Where("employee_areas.area_id = ?", params.AreaID)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "created_at"
	}
	sortDir := params.SortDir
	if sortDir == "" {
		sortDir = "desc"
	}
	query = query.Order("is_active DESC, " + sortBy + " " + sortDir)

	// Apply pagination
	if params.PerPage > 0 {
		offset := (params.Page - 1) * params.PerPage
		if offset < 0 {
			offset = 0
		}
		query = query.Offset(offset).Limit(params.PerPage)
	}

	// Preload relations
	err := query.
		Preload("Division").
		Preload("JobPosition").
		Preload("Company").
		Preload("Areas.Area").
		Find(&employees).Error
	if err != nil {
		return nil, 0, err
	}

	return employees, total, nil
}

func (r *employeeRepository) Update(ctx context.Context, employee *models.Employee) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Save(employee).Error
}

func (r *employeeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Employee{}, "id = ?", id).Error
}
