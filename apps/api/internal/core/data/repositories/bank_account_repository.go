package repositories

import (
	"context"
	"strings"

	"github.com/gilabs/gims/api/internal/core/data/models"
	"gorm.io/gorm"
)

type BankAccountListParams struct {
	Search   string
	IsActive *bool
	SortBy   string
	SortDir  string
	Limit    int
	Offset   int
}

type BankAccountRepository interface {
	Create(ctx context.Context, bankAccount *models.BankAccount) error
	FindByID(ctx context.Context, id string) (*models.BankAccount, error)
	List(ctx context.Context, params BankAccountListParams) ([]models.BankAccount, int64, error)
	Update(ctx context.Context, bankAccount *models.BankAccount) error
	Delete(ctx context.Context, id string) error
}

type bankAccountRepository struct {
	db *gorm.DB
}

func NewBankAccountRepository(db *gorm.DB) BankAccountRepository {
	return &bankAccountRepository{db: db}
}

func (r *bankAccountRepository) Create(ctx context.Context, bankAccount *models.BankAccount) error {
	return r.db.WithContext(ctx).Create(bankAccount).Error
}

func (r *bankAccountRepository) FindByID(ctx context.Context, id string) (*models.BankAccount, error) {
	var bankAccount models.BankAccount
	if err := r.db.WithContext(ctx).First(&bankAccount, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &bankAccount, nil
}

var bankAccountAllowedSort = map[string]string{
	"created_at": "bank_accounts.created_at",
	"updated_at": "bank_accounts.updated_at",
	"name":       "bank_accounts.name",
	"currency":   "bank_accounts.currency",
}

func (r *bankAccountRepository) List(ctx context.Context, params BankAccountListParams) ([]models.BankAccount, int64, error) {
	var items []models.BankAccount
	var total int64

	q := r.db.WithContext(ctx).Model(&models.BankAccount{})

	if s := strings.TrimSpace(params.Search); s != "" {
		like := "%" + s + "%"
		q = q.Where("bank_accounts.name ILIKE ? OR bank_accounts.account_number ILIKE ? OR bank_accounts.account_holder ILIKE ?", like, like, like)
	}
	if params.IsActive != nil {
		q = q.Where("bank_accounts.is_active = ?", *params.IsActive)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := bankAccountAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = bankAccountAllowedSort["created_at"]
	}
	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	q = q.Order(sortCol + " " + sortDir)

	if params.Limit > 0 {
		q = q.Limit(params.Limit)
	}
	if params.Offset > 0 {
		q = q.Offset(params.Offset)
	}

	if err := q.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *bankAccountRepository) Update(ctx context.Context, bankAccount *models.BankAccount) error {
	return r.db.WithContext(ctx).Save(bankAccount).Error
}

func (r *bankAccountRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.BankAccount{}, "id = ?", id).Error
}
