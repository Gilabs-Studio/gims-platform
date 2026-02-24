package repositories

import (
	"context"
	"strings"

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

type SalaryStructureRepository interface {
	FindByID(ctx context.Context, id string) (*financeModels.SalaryStructure, error)
	List(ctx context.Context, params SalaryStructureListParams) ([]financeModels.SalaryStructure, int64, error)
	GetActiveByEmployeeID(ctx context.Context, employeeID string) (*financeModels.SalaryStructure, error)
	DeactivateAllByEmployeeID(ctx context.Context, tx *gorm.DB, employeeID string) error
}

type salaryStructureRepository struct {
	db *gorm.DB
}

func NewSalaryStructureRepository(db *gorm.DB) SalaryStructureRepository {
	return &salaryStructureRepository{db: db}
}

func (r *salaryStructureRepository) FindByID(ctx context.Context, id string) (*financeModels.SalaryStructure, error) {
	var item financeModels.SalaryStructure
	if err := r.db.WithContext(ctx).First(&item, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *salaryStructureRepository) GetActiveByEmployeeID(ctx context.Context, employeeID string) (*financeModels.SalaryStructure, error) {
	var item financeModels.SalaryStructure
	if err := r.db.WithContext(ctx).Where("employee_id = ? AND status = ?", employeeID, financeModels.SalaryStructureStatusActive).First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *salaryStructureRepository) DeactivateAllByEmployeeID(ctx context.Context, tx *gorm.DB, employeeID string) error {
	return tx.WithContext(ctx).Model(&financeModels.SalaryStructure{}).
		Where("employee_id = ? AND status = ?", employeeID, financeModels.SalaryStructureStatusActive).
		Update("status", financeModels.SalaryStructureStatusInactive).Error
}

func (r *salaryStructureRepository) List(ctx context.Context, params SalaryStructureListParams) ([]financeModels.SalaryStructure, int64, error) {
	var items []financeModels.SalaryStructure
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.SalaryStructure{})

	if params.EmployeeID != nil {
		q = q.Where("employee_id = ?", *params.EmployeeID)
	}
	if params.Status != nil {
		q = q.Where("status = ?", *params.Status)
	}
	if s := strings.TrimSpace(params.Search); s != "" {
		// Since we don't have employee name in this table, we might need to join if we want to search by name
		// For now searching in notes
		like := "%" + s + "%"
		q = q.Where("notes ILIKE ?", like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := "effective_date"
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

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}
