package repositories

import (
	"context"

	"github.com/gilabs/gims/api/internal/customer/data/models"
	"gorm.io/gorm"
)

// CustomerRepository defines the interface for customer data access
type CustomerRepository interface {
	Create(ctx context.Context, customer *models.Customer) error
	FindByID(ctx context.Context, id string) (*models.Customer, error)
	FindByCode(ctx context.Context, code string) (*models.Customer, error)
	List(ctx context.Context, params CustomerListParams) ([]models.Customer, int64, error)
	Update(ctx context.Context, customer *models.Customer) error
	Delete(ctx context.Context, id string) error
	// Nested bank account operations
	CreateBankAccount(ctx context.Context, bank *models.CustomerBank) error
	UpdateBankAccount(ctx context.Context, bank *models.CustomerBank) error
	DeleteBankAccount(ctx context.Context, id string) error
	// Code generation
	GetNextCode(ctx context.Context) (string, error)
}

type customerRepository struct {
	db *gorm.DB
}

// NewCustomerRepository creates a new CustomerRepository
func NewCustomerRepository(db *gorm.DB) CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) Create(ctx context.Context, customer *models.Customer) error {
	return r.db.WithContext(ctx).Create(customer).Error
}

func (r *customerRepository) FindByID(ctx context.Context, id string) (*models.Customer, error) {
	var customer models.Customer
	err := r.db.WithContext(ctx).
		Preload("CustomerType").
		Preload("Province").
		Preload("City").
		Preload("District").
		Preload("Village.District.City.Province").
		Preload("BankAccounts.Bank").
		Preload("BankAccounts.Currency").
		Preload("DefaultBusinessType").
		Preload("DefaultArea").
		Preload("DefaultSalesRep").
		Preload("DefaultPaymentTerms").
		First(&customer, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *customerRepository) FindByCode(ctx context.Context, code string) (*models.Customer, error) {
	var customer models.Customer
	err := r.db.WithContext(ctx).
		Preload("CustomerType").
		First(&customer, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *customerRepository) List(ctx context.Context, params CustomerListParams) ([]models.Customer, int64, error) {
	var customers []models.Customer
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Customer{})

	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where(
			"name ILIKE ? OR code ILIKE ? OR email ILIKE ? OR contact_person ILIKE ?",
			search, search, search, search,
		)
	}
	if params.CustomerTypeID != "" {
		query = query.Where("customer_type_id = ?", params.CustomerTypeID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

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

	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	query = query.Preload("Province").
		Preload("City").
		Preload("District").
		Preload("CustomerType").
		Preload("BankAccounts.Bank").
		Preload("BankAccounts.Currency")

	if err := query.Find(&customers).Error; err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}

func (r *customerRepository) Update(ctx context.Context, customer *models.Customer) error {
	return r.db.WithContext(ctx).Save(customer).Error
}

func (r *customerRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Customer{}, "id = ?", id).Error
}

func (r *customerRepository) CreateBankAccount(ctx context.Context, bank *models.CustomerBank) error {
	return r.db.WithContext(ctx).Create(bank).Error
}

func (r *customerRepository) UpdateBankAccount(ctx context.Context, bank *models.CustomerBank) error {
	return r.db.WithContext(ctx).Save(bank).Error
}

func (r *customerRepository) DeleteBankAccount(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.CustomerBank{}, "id = ?", id).Error
}

// GetNextCode generates the next customer code in the format CUST-XXXXX
func (r *customerRepository) GetNextCode(ctx context.Context) (string, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.Customer{}).Count(&count).Error; err != nil {
		return "", err
	}
	return generateCustomerCode(int(count) + 1), nil
}

func generateCustomerCode(seq int) string {
	return "CUST-" + padNumber(seq, 5)
}

func padNumber(n, width int) string {
	s := ""
	for i := 0; i < width; i++ {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
