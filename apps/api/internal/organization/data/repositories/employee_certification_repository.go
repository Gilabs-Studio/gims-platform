package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/organization/data/models"
	"gorm.io/gorm"
)

type EmployeeCertificationRepository interface {
	Create(ctx context.Context, certification *models.EmployeeCertification) error
	Update(ctx context.Context, certification *models.EmployeeCertification) error
	Delete(ctx context.Context, id string) error
	FindByID(ctx context.Context, id string) (*models.EmployeeCertification, error)
	FindByEmployeeID(ctx context.Context, employeeID string) ([]*models.EmployeeCertification, error)
	FindLatestByEmployeeID(ctx context.Context, employeeID string) (*models.EmployeeCertification, error)
}

type employeeCertificationRepository struct {
	db *gorm.DB
}

func NewEmployeeCertificationRepository(db *gorm.DB) EmployeeCertificationRepository {
	return &employeeCertificationRepository{db: db}
}

func (r *employeeCertificationRepository) Create(ctx context.Context, certification *models.EmployeeCertification) error {
	return r.db.WithContext(ctx).Create(certification).Error
}

func (r *employeeCertificationRepository) Update(ctx context.Context, certification *models.EmployeeCertification) error {
	return r.db.WithContext(ctx).Save(certification).Error
}

func (r *employeeCertificationRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.EmployeeCertification{}, "id = ?", id).Error
}

func (r *employeeCertificationRepository) FindByID(ctx context.Context, id string) (*models.EmployeeCertification, error) {
	var certification models.EmployeeCertification
	err := r.db.WithContext(ctx).First(&certification, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &certification, nil
}

func (r *employeeCertificationRepository) FindByEmployeeID(ctx context.Context, employeeID string) ([]*models.EmployeeCertification, error) {
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

func (r *employeeCertificationRepository) FindLatestByEmployeeID(ctx context.Context, employeeID string) (*models.EmployeeCertification, error) {
	var certification models.EmployeeCertification
	err := r.db.WithContext(ctx).
		Where("employee_id = ? AND (expiry_date IS NULL OR expiry_date >= NOW())", employeeID).
		Order("issue_date DESC").
		First(&certification).Error
	if err != nil {
		return nil, err
	}
	return &certification, nil
}
