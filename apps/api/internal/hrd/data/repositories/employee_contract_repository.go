package repositories

import (
	"context"
	"time"

	"github.com/gilabs/gims/api/internal/hrd/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EmployeeContractRepository interface {
	Create(ctx context.Context, contract *models.EmployeeContract) error
	Update(ctx context.Context, contract *models.EmployeeContract) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*models.EmployeeContract, error)
	FindAll(ctx context.Context, page, perPage int, employeeID *uuid.UUID, status *models.ContractStatus, contractType *models.ContractType) ([]*models.EmployeeContract, int64, error)
	FindByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*models.EmployeeContract, error)
	FindExpiring(ctx context.Context, days int, page, perPage int) ([]*models.EmployeeContract, int64, error)
	FindByContractNumber(ctx context.Context, contractNumber string) (*models.EmployeeContract, error)
	CountByEmployee(ctx context.Context, employeeID uuid.UUID) (int64, error)
}

type employeeContractRepository struct {
	db *gorm.DB
}

func NewEmployeeContractRepository(db *gorm.DB) EmployeeContractRepository {
	return &employeeContractRepository{db: db}
}

func (r *employeeContractRepository) Create(ctx context.Context, contract *models.EmployeeContract) error {
	return r.db.WithContext(ctx).Create(contract).Error
}

func (r *employeeContractRepository) Update(ctx context.Context, contract *models.EmployeeContract) error {
	return r.db.WithContext(ctx).Save(contract).Error
}

func (r *employeeContractRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.EmployeeContract{}, "id = ?", id).Error
}

func (r *employeeContractRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.EmployeeContract, error) {
	var contract models.EmployeeContract
	err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&contract).Error
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

func (r *employeeContractRepository) FindAll(ctx context.Context, page, perPage int, employeeID *uuid.UUID, status *models.ContractStatus, contractType *models.ContractType) ([]*models.EmployeeContract, int64, error) {
	var contracts []*models.EmployeeContract
	var total int64

	query := r.db.WithContext(ctx).Model(&models.EmployeeContract{})

	// Filters
	if employeeID != nil {
		query = query.Where("employee_id = ?", *employeeID)
	}
	if status != nil {
		query = query.Where("status = ?", *status)
	}
	if contractType != nil {
		query = query.Where("contract_type = ?", *contractType)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (page - 1) * perPage
	err := query.
		Order("start_date DESC, created_at DESC").
		Offset(offset).
		Limit(perPage).
		Find(&contracts).Error

	return contracts, total, err
}

func (r *employeeContractRepository) FindByEmployeeID(ctx context.Context, employeeID uuid.UUID) ([]*models.EmployeeContract, error) {
	var contracts []*models.EmployeeContract
	err := r.db.WithContext(ctx).
		Where("employee_id = ?", employeeID).
		Order("start_date DESC").
		Find(&contracts).Error
	return contracts, err
}

func (r *employeeContractRepository) FindExpiring(ctx context.Context, days int, page, perPage int) ([]*models.EmployeeContract, int64, error) {
	var contracts []*models.EmployeeContract
	var total int64

	threshold := time.Now().AddDate(0, 0, days)
	now := time.Now()

	query := r.db.WithContext(ctx).Model(&models.EmployeeContract{}).
		Where("status = ?", models.ContractStatusActive).
		Where("end_date IS NOT NULL").
		Where("end_date BETWEEN ? AND ?", now, threshold)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (page - 1) * perPage
	err := query.
		Order("end_date ASC").
		Offset(offset).
		Limit(perPage).
		Find(&contracts).Error

	return contracts, total, err
}

func (r *employeeContractRepository) FindByContractNumber(ctx context.Context, contractNumber string) (*models.EmployeeContract, error) {
	var contract models.EmployeeContract
	err := r.db.WithContext(ctx).
		Where("contract_number = ?", contractNumber).
		First(&contract).Error
	if err != nil {
		return nil, err
	}
	return &contract, nil
}

func (r *employeeContractRepository) CountByEmployee(ctx context.Context, employeeID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EmployeeContract{}).
		Where("employee_id = ?", employeeID).
		Count(&count).Error
	return count, err
}
