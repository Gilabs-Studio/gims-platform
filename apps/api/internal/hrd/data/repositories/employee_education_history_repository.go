package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmployeeEducationHistoryRepository interface {
	Create(ctx context.Context, education *models.EmployeeEducationHistory) error
	Update(ctx context.Context, education *models.EmployeeEducationHistory) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.EmployeeEducationHistory, error)
	FindAll(ctx context.Context, page, perPage int, employeeID *uuid.UUID, degree *models.DegreeLevel, search string) ([]*models.EmployeeEducationHistory, int64, error)
	FindByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*models.EmployeeEducationHistory, error)
	CountByEmployee(ctx context.Context, employeeID uuid.UUID) (int64, error)
}

type employeeEducationHistoryRepository struct {
	db *gorm.DB
}

func NewEmployeeEducationHistoryRepository(db *gorm.DB) EmployeeEducationHistoryRepository {
	return &employeeEducationHistoryRepository{db: db}
}

func (r *employeeEducationHistoryRepository) Create(ctx context.Context, education *models.EmployeeEducationHistory) error {
	return r.db.WithContext(ctx).Create(education).Error
}

func (r *employeeEducationHistoryRepository) Update(ctx context.Context, education *models.EmployeeEducationHistory) error {
	return r.db.WithContext(ctx).Save(education).Error
}

func (r *employeeEducationHistoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.EmployeeEducationHistory{}, "id = ?", id).Error
}

func (r *employeeEducationHistoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.EmployeeEducationHistory, error) {
	var education models.EmployeeEducationHistory
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&education).Error
	if err != nil {
		return nil, err
	}
	return &education, nil
}

func (r *employeeEducationHistoryRepository) FindAll(ctx context.Context, page, perPage int, employeeID *uuid.UUID, degree *models.DegreeLevel, search string) ([]*models.EmployeeEducationHistory, int64, error) {
	var educations []*models.EmployeeEducationHistory
	var total int64

	query := r.db.WithContext(ctx).Model(&models.EmployeeEducationHistory{})

	// Search by institution or field of study
	if search != "" {
		query = query.Where("institution ILIKE ? OR field_of_study ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Filters
	if employeeID != nil {
		query = query.Where("employee_id = ?", *employeeID)
	}
	if degree != nil {
		query = query.Where("degree = ?", *degree)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (page - 1) * perPage
	if err := query.
		Order("start_date DESC").
		Limit(perPage).
		Offset(offset).
		Find(&educations).Error; err != nil {
		return nil, 0, err
	}

	return educations, total, nil
}

func (r *employeeEducationHistoryRepository) FindByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*models.EmployeeEducationHistory, error) {
	var educations []*models.EmployeeEducationHistory
	err := r.db.WithContext(ctx).
		Where("employee_id = ?", employeeID).
		Order("start_date DESC").
		Find(&educations).Error
	if err != nil {
		return nil, err
	}
	return educations, nil
}

func (r *employeeEducationHistoryRepository) CountByEmployee(ctx context.Context, employeeID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EmployeeEducationHistory{}).
		Where("employee_id = ?", employeeID).
		Count(&count).Error
	return count, err
}
