package repositories

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"context"

	"github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"strings"
)

// SupplierRepository defines the interface for supplier data access
type SupplierRepository interface {
	Create(ctx context.Context, supplier *models.Supplier) error
	FindByID(ctx context.Context, id string) (*models.Supplier, error)
	FindByCode(ctx context.Context, code string) (*models.Supplier, error)
	List(ctx context.Context, params SupplierListParams) ([]models.Supplier, int64, error)
	Update(ctx context.Context, supplier *models.Supplier) error
	Delete(ctx context.Context, id string) error
	// Code generation
	GetNextCode(ctx context.Context) (string, error)
	// Nested operations
	CreateContact(ctx context.Context, phone *models.SupplierContact) error
	UpdateContact(ctx context.Context, phone *models.SupplierContact) error
	DeleteContact(ctx context.Context, id string) error
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
	return database.GetDB(ctx, r.db).Create(supplier).Error
}

func (r *supplierRepository) FindByID(ctx context.Context, id string) (*models.Supplier, error) {
	var supplier models.Supplier
	err := database.GetDB(ctx, r.db).
		Preload("SupplierType").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province").
		Preload("Contacts.ContactRole").
		Preload("BankAccounts.Bank").
		Preload("BankAccounts.Currency").
		First(&supplier, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *supplierRepository) FindByCode(ctx context.Context, code string) (*models.Supplier, error) {
	var supplier models.Supplier
	err := database.GetDB(ctx, r.db).
		Preload("SupplierType").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		First(&supplier, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *supplierRepository) List(ctx context.Context, params SupplierListParams) ([]models.Supplier, int64, error) {
	var suppliers []models.Supplier
	var total int64

	query := database.GetDB(ctx, r.db).Model(&models.Supplier{})

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

	// Apply sorting with whitelist and clause builder to prevent SQL injection
	allowedSortColumns := map[string]string{
		"name":       "name",
		"code":       "code",
		"email":      "email",
		"status":     "status",
		"is_active":  "is_active",
		"created_at": "created_at",
		"updated_at": "updated_at",
	}

	sortBy := allowedSortColumns[strings.ToLower(strings.TrimSpace(params.SortBy))]
	if sortBy == "" {
		sortBy = "name"
	}

	isDesc := strings.ToLower(strings.TrimSpace(params.SortDir)) == "desc"
	query = query.Order(clause.OrderByColumn{Column: clause.Column{Name: sortBy}, Desc: isDesc})

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	// Preload relations
	query = query.Preload("Province").
		Preload("City").
		Preload("District").
		Preload("SupplierType").
		Preload("PaymentTerms").
		Preload("BusinessUnit").
		Preload("Contacts.ContactRole").
		Preload("BankAccounts.Bank").
		Preload("BankAccounts.Currency")

	if err := query.Find(&suppliers).Error; err != nil {
		return nil, 0, err
	}

	return suppliers, total, nil
}

func (r *supplierRepository) Update(ctx context.Context, supplier *models.Supplier) error {
	return database.GetDB(ctx, r.db).Save(supplier).Error
}

func (r *supplierRepository) Delete(ctx context.Context, id string) error {
	return database.GetDB(ctx, r.db).Delete(&models.Supplier{}, "id = ?", id).Error
}

// GetNextCode generates the next supplier code in the format SUP-XXXXX
func (r *supplierRepository) GetNextCode(ctx context.Context) (string, error) {
	var count int64
	if err := database.GetDB(ctx, r.db).Model(&models.Supplier{}).Count(&count).Error; err != nil {
		return "", err
	}
	return generateSupplierCode(int(count) + 1), nil
}

func generateSupplierCode(seq int) string {
	return "SUP-" + padSupplierNumber(seq, 5)
}

func padSupplierNumber(n, width int) string {
	s := ""
	for i := 0; i < width; i++ {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}

// Nested Phone Number operations
func (r *supplierRepository) CreateContact(ctx context.Context, phone *models.SupplierContact) error {
	return database.GetDB(ctx, r.db).Create(phone).Error
}

func (r *supplierRepository) UpdateContact(ctx context.Context, phone *models.SupplierContact) error {
	return database.GetDB(ctx, r.db).Save(phone).Error
}

func (r *supplierRepository) DeleteContact(ctx context.Context, id string) error {
	return database.GetDB(ctx, r.db).Delete(&models.SupplierContact{}, "id = ?", id).Error
}

// Nested Bank Account operations
func (r *supplierRepository) CreateBankAccount(ctx context.Context, bank *models.SupplierBank) error {
	return database.GetDB(ctx, r.db).Create(bank).Error
}

func (r *supplierRepository) UpdateBankAccount(ctx context.Context, bank *models.SupplierBank) error {
	return database.GetDB(ctx, r.db).Save(bank).Error
}

func (r *supplierRepository) DeleteBankAccount(ctx context.Context, id string) error {
	return database.GetDB(ctx, r.db).Delete(&models.SupplierBank{}, "id = ?", id).Error
}
