package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"gorm.io/gorm"
)

type EmployeeCertificationRepository struct {
	db *gorm.DB
}

// NewEmployeeCertificationRepository creates a new instance of EmployeeCertificationRepository
func NewEmployeeCertificationRepository(db *gorm.DB) EmployeeCertificationRepositoryInterface {
	return &EmployeeCertificationRepository{db: db}
}

// Create inserts a new employee certification record
func (r *EmployeeCertificationRepository) Create(ctx context.Context, certification *models.EmployeeCertification) error {
	return r.db.WithContext(ctx).Create(certification).Error
}

// Update modifies an existing employee certification record
func (r *EmployeeCertificationRepository) Update(ctx context.Context, certification *models.EmployeeCertification) error {
	return r.db.WithContext(ctx).Save(certification).Error
}

// Delete soft deletes an employee certification record
func (r *EmployeeCertificationRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.EmployeeCertification{}, "id = ?", id).Error
}

// FindByID retrieves an employee certification by ID
func (r *EmployeeCertificationRepository) FindByID(ctx context.Context, id string) (*models.EmployeeCertification, error) {
	var certification models.EmployeeCertification
	err := r.db.WithContext(ctx).First(&certification, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &certification, nil
}

// FindAll retrieves all employee certifications with pagination and optional filters
func (r *EmployeeCertificationRepository) FindAll(ctx context.Context, page, perPage int, search, employeeID string) ([]*models.EmployeeCertification, int64, error) {
	var certifications []*models.EmployeeCertification
	var total int64

	query := r.db.WithContext(ctx).Model(&models.EmployeeCertification{})

	// Search filter (certificate name or issued by)
	if search != "" {
		searchPattern := search + "%"
		query = query.Where("certificate_name ILIKE ? OR issued_by ILIKE ?", searchPattern, searchPattern)
	}

	// Employee filter
	if employeeID != "" {
		query = query.Where("employee_id = ?", employeeID)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (page - 1) * perPage
	err := query.Order("issue_date DESC").
		Limit(perPage).
		Offset(offset).
		Find(&certifications).Error

	if err != nil {
		return nil, 0, err
	}

	return certifications, total, nil
}

// FindByEmployeeID retrieves all certifications for a specific employee
func (r *EmployeeCertificationRepository) FindByEmployeeID(ctx context.Context, employeeID string) ([]*models.EmployeeCertification, error) {
	var certifications []*models.EmployeeCertification
	err := r.db.WithContext(ctx).
		Where("employee_id = ?", employeeID).
		Order("issue_date DESC").
		Find(&certifications).Error
	if err != nil {
		return nil, err
	}
	return certifications, nil
}

// FindExpiringCertifications retrieves certifications expiring within specified days
func (r *EmployeeCertificationRepository) FindExpiringCertifications(ctx context.Context, daysBeforeExpiry int) ([]*models.EmployeeCertification, error) {
	var certifications []*models.EmployeeCertification
	expiryDate := time.Now().AddDate(0, 0, daysBeforeExpiry)

	err := r.db.WithContext(ctx).
		Where("expiry_date IS NOT NULL").
		Where("expiry_date <= ?", expiryDate).
		Where("expiry_date >= ?", time.Now()).
		Order("expiry_date ASC").
		Find(&certifications).Error

	if err != nil {
		return nil, err
	}
	return certifications, nil
}
