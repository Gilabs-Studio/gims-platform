package repositories

import (
	"context"
	"strings"
	"time"

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
	ListTransactionHistory(ctx context.Context, bankAccountID string, limit int) ([]BankAccountTransaction, error)
	Update(ctx context.Context, bankAccount *models.BankAccount) error
	Delete(ctx context.Context, id string) error
}

type BankAccountTransaction struct {
	ID              string
	TransactionType string
	TransactionDate time.Time
	ReferenceID     string
	SalesOrderID    *string
	Amount          float64
	Status          string
	Description     string
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

func (r *bankAccountRepository) ListTransactionHistory(ctx context.Context, bankAccountID string, limit int) ([]BankAccountTransaction, error) {
	if limit <= 0 {
		limit = 100
	}

	const query = `
		SELECT
			t.id,
			t.transaction_type,
			t.transaction_date,
			t.reference_id,
			t.sales_order_id,
			t.amount,
			t.status,
			t.description
		FROM (
			SELECT
				p.id,
				'payment' AS transaction_type,
				p.payment_date::timestamp AS transaction_date,
				p.id AS reference_id,
				NULL::text AS sales_order_id,
				p.total_amount AS amount,
				p.status::text AS status,
				COALESCE(p.description, '') AS description
			FROM payments p
			WHERE p.bank_account_id = ? AND p.deleted_at IS NULL

			UNION ALL

			SELECT
				cbj.id,
				'cash_bank_journal' AS transaction_type,
				cbj.transaction_date::timestamp AS transaction_date,
				cbj.id AS reference_id,
				NULL::text AS sales_order_id,
				cbj.total_amount AS amount,
				cbj.status::text AS status,
				COALESCE(cbj.description, '') AS description
			FROM cash_bank_journals cbj
			WHERE cbj.bank_account_id = ? AND cbj.deleted_at IS NULL

			UNION ALL

			SELECT
				sp.id,
				'sales_payment' AS transaction_type,
				sp.created_at AS transaction_date,
				sp.id AS reference_id,
				ci.sales_order_id::text AS sales_order_id,
				sp.amount AS amount,
				sp.status::text AS status,
				COALESCE(sp.notes, '') AS description
			FROM sales_payments sp
			LEFT JOIN customer_invoices ci ON ci.id = sp.customer_invoice_id
			WHERE sp.bank_account_id = ? AND sp.deleted_at IS NULL
		) t
		ORDER BY t.transaction_date DESC
		LIMIT ?
	`

	items := make([]BankAccountTransaction, 0)
	if err := r.db.WithContext(ctx).Raw(query, bankAccountID, bankAccountID, bankAccountID, limit).Scan(&items).Error; err != nil {
		return nil, err
	}

	return items, nil
}

func (r *bankAccountRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.BankAccount{}, "id = ?", id).Error
}
