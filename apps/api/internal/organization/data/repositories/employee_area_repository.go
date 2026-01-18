package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/organization/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// EmployeeAreaRepository defines the interface for employee area assignment operations
type EmployeeAreaRepository interface {
	AssignAreas(ctx context.Context, employeeID string, areaIDs []string) error
	RemoveAreas(ctx context.Context, employeeID string, areaIDs []string) error
	RemoveAllAreas(ctx context.Context, employeeID string) error
	GetByEmployeeID(ctx context.Context, employeeID string) ([]models.EmployeeArea, error)
	GetByAreaID(ctx context.Context, areaID string) ([]models.EmployeeArea, error)
}

type employeeAreaRepository struct {
	db *gorm.DB
}

// NewEmployeeAreaRepository creates a new EmployeeAreaRepository instance
func NewEmployeeAreaRepository(db *gorm.DB) EmployeeAreaRepository {
	return &employeeAreaRepository{db: db}
}

func (r *employeeAreaRepository) AssignAreas(ctx context.Context, employeeID string, areaIDs []string) error {
	if len(areaIDs) == 0 {
		return nil
	}

	// Create employee areas in bulk
	var employeeAreas []models.EmployeeArea
	for _, areaID := range areaIDs {
		employeeAreas = append(employeeAreas, models.EmployeeArea{
			EmployeeID: employeeID,
			AreaID:     areaID,
		})
	}

	// Use ON CONFLICT DO NOTHING to ignore duplicates
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{DoNothing: true}).
		Create(&employeeAreas).Error
}

func (r *employeeAreaRepository) RemoveAreas(ctx context.Context, employeeID string, areaIDs []string) error {
	return r.db.WithContext(ctx).
		Where("employee_id = ? AND area_id IN ?", employeeID, areaIDs).
		Delete(&models.EmployeeArea{}).Error
}

func (r *employeeAreaRepository) RemoveAllAreas(ctx context.Context, employeeID string) error {
	return r.db.WithContext(ctx).
		Where("employee_id = ?", employeeID).
		Delete(&models.EmployeeArea{}).Error
}

func (r *employeeAreaRepository) GetByEmployeeID(ctx context.Context, employeeID string) ([]models.EmployeeArea, error) {
	var areas []models.EmployeeArea
	err := r.db.WithContext(ctx).
		Preload("Area").
		Where("employee_id = ?", employeeID).
		Find(&areas).Error
	return areas, err
}

func (r *employeeAreaRepository) GetByAreaID(ctx context.Context, areaID string) ([]models.EmployeeArea, error) {
	var areas []models.EmployeeArea
	err := r.db.WithContext(ctx).
		Preload("Employee").
		Where("area_id = ?", areaID).
		Find(&areas).Error
	return areas, err
}
