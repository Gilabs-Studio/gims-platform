package repositories

import (
	"context"

	"github.com/gilabs/crm-healthcare/api/internal/supplier/data/models"
	"gorm.io/gorm"
)

// SupplierRepository defines the interface for supplier data access
type SupplierRepository interface {
	Create(ctx context.Context, supplier *models.Supplier) error
	FindByID(ctx context.Context, id string) (*models.Supplier, error)
	FindByCode(ctx context.Context, code string) (*models.Supplier, error)
	List(ctx context.Context, params SupplierListParams) ([]models.Supplier, int64, error)
	Update(ctx context.Context, supplier *models.Supplier) error
	Delete(ctx context.Context, id string) error
	// Nested operations
	CreatePhoneNumber(ctx context.Context, phone *models.SupplierPhoneNumber) error
	UpdatePhoneNumber(ctx context.Context, phone *models.SupplierPhoneNumber) error
	DeletePhoneNumber(ctx context.Context, id string) error
	CreateBankAccount(ctx context.Context, bank *models.SupplierBank) error
	UpdateBankAccount(ctx context.Context, bank *models.SupplierBank) error
	DeleteBankAccount(ctx context.Context, id string) error
}

type supplierRepository struct {
	db *gorm.DB
}

// NewSupplierRepository creates a new instance of SupplierRepository
func NewSupplierRepository(db *gorm.DB) SupplierRepository {
	return &supplierRepository{db: db}
}

func (r *supplierRepository) Create(ctx context.Context, supplier *models.Supplier) error {
	return r.db.WithContext(ctx).Create(supplier).Error
}

func (r *supplierRepository) FindByID(ctx context.Context, id string) (*models.Supplier, error) {
	var supplier models.Supplier
	err := r.db.WithContext(ctx).
		Preload("SupplierType").
		Preload("Village.District.City.Province").
		Preload("PhoneNumbers").
		Preload("BankAccounts.Bank").
		First(&supplier, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *supplierRepository) FindByCode(ctx context.Context, code string) (*models.Supplier, error) {
	var supplier models.Supplier
	err := r.db.WithContext(ctx).
		Preload("SupplierType").
		First(&supplier, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *supplierRepository) List(ctx context.Context, params SupplierListParams) ([]models.Supplier, int64, error) {
	var suppliers []models.Supplier
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Supplier{})

	// Apply search filter
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR email ILIKE ? OR contact_person ILIKE ?", search, search, search, search)
	}

	// Apply supplier type filter
	if params.SupplierTypeID != "" {
		query = query.Where("supplier_type_id = ?", params.SupplierTypeID)
	}

	// Apply status filter
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// Apply approval filter
	if params.IsApproved != nil {
		query = query.Where("is_approved = ?", *params.IsApproved)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply sorting
	if params.SortBy != "" {
		order := params.SortBy
		if params.SortDir == "desc" {
			order += " DESC"
		} else {
			order += " ASC"
		}
		query = query.Order(order)
	} else {
		query = query.Order("name ASC")
	}

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	// Preload relations
	query = query.Preload("SupplierType").Preload("PhoneNumbers").Preload("BankAccounts.Bank")

	if err := query.Find(&suppliers).Error; err != nil {
		return nil, 0, err
	}

	return suppliers, total, nil
}

func (r *supplierRepository) Update(ctx context.Context, supplier *models.Supplier) error {
	return r.db.WithContext(ctx).Save(supplier).Error
}

func (r *supplierRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Supplier{}, "id = ?", id).Error
}

// Nested Phone Number operations
func (r *supplierRepository) CreatePhoneNumber(ctx context.Context, phone *models.SupplierPhoneNumber) error {
	return r.db.WithContext(ctx).Create(phone).Error
}

func (r *supplierRepository) UpdatePhoneNumber(ctx context.Context, phone *models.SupplierPhoneNumber) error {
	return r.db.WithContext(ctx).Save(phone).Error
}

func (r *supplierRepository) DeletePhoneNumber(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.SupplierPhoneNumber{}, "id = ?", id).Error
}

// Nested Bank Account operations
func (r *supplierRepository) CreateBankAccount(ctx context.Context, bank *models.SupplierBank) error {
	return r.db.WithContext(ctx).Create(bank).Error
}

func (r *supplierRepository) UpdateBankAccount(ctx context.Context, bank *models.SupplierBank) error {
	return r.db.WithContext(ctx).Save(bank).Error
}

func (r *supplierRepository) DeleteBankAccount(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.SupplierBank{}, "id = ?", id).Error
}
