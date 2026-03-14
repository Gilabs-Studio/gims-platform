package repositories

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/data/models"
	customerModels "github.com/gilabs/gims/api/internal/customer/data/models"
	supplierModels "github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm"
)

type BankAccountListParams struct {
	Search     string
	IsActive   *bool
	OwnerType  string
	CurrencyID string
	SortBy     string
	SortDir    string
	Limit      int
	Offset     int
}

type BankAccountRepository interface {
	Create(ctx context.Context, bankAccount *models.BankAccount) error
	FindByID(ctx context.Context, id string) (*models.BankAccount, error)
	List(ctx context.Context, params BankAccountListParams) ([]models.BankAccount, int64, error)
	ListUnified(ctx context.Context, params BankAccountListParams) ([]UnifiedBankAccount, int64, error)
	ListTransactionHistory(ctx context.Context, bankAccountID string, limit int) ([]BankAccountTransaction, error)
	ListTransactionHistoryPaginated(ctx context.Context, bankAccountID string, limit, offset int) ([]BankAccountTransaction, int64, error)
	Update(ctx context.Context, bankAccount *models.BankAccount) error
	Delete(ctx context.Context, id string) error
}

type UnifiedBankAccount struct {
	ID                    string
	SourceType            string
	Name                  string
	BankName              *string
	BankCode              *string
	AccountNumber         string
	AccountHolder         string
	CurrencyID            *string
	CurrencyCode          string
	CurrencyName          *string
	CurrencySymbol        *string
	CurrencyDecimalPlaces *int
	OwnerType             string
	OwnerID               *string
	OwnerName             string
	OwnerCode             *string
	IsActive              bool
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type BankAccountTransaction struct {
	ID                 string
	TransactionType    string
	TransactionDate    time.Time
	ReferenceType      string
	ReferenceID        string
	ReferenceNumber    *string
	RelatedEntityType  *string
	RelatedEntityID    *string
	RelatedEntityLabel *string
	Amount             float64
	Status             string
	Description        string
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
	if err := r.db.WithContext(ctx).Preload("CurrencyDetail").First(&bankAccount, "id = ?", id).Error; err != nil {
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

	if err := q.Preload("CurrencyDetail").Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func (r *bankAccountRepository) Update(ctx context.Context, bankAccount *models.BankAccount) error {
	return r.db.WithContext(ctx).Save(bankAccount).Error
}

func (r *bankAccountRepository) ListUnified(ctx context.Context, params BankAccountListParams) ([]UnifiedBankAccount, int64, error) {
	items := make([]UnifiedBankAccount, 0)

	var companyAccounts []models.BankAccount
	companyQuery := r.db.WithContext(ctx).Preload("CurrencyDetail").Model(&models.BankAccount{})
	if params.IsActive != nil {
		companyQuery = companyQuery.Where("is_active = ?", *params.IsActive)
	}
	if err := companyQuery.Find(&companyAccounts).Error; err != nil {
		return nil, 0, err
	}
	for _, account := range companyAccounts {
		var decimalPlaces *int
		var currencyName *string
		var currencySymbol *string
		if account.CurrencyDetail != nil {
			decimalPlaces = &account.CurrencyDetail.DecimalPlaces
			currencyName = &account.CurrencyDetail.Name
			currencySymbol = &account.CurrencyDetail.Symbol
		}
		items = append(items, UnifiedBankAccount{
			ID:                    account.ID,
			SourceType:            "company",
			Name:                  account.Name,
			AccountNumber:         account.AccountNumber,
			AccountHolder:         account.AccountHolder,
			CurrencyID:            account.CurrencyID,
			CurrencyCode:          account.Currency,
			CurrencyName:          currencyName,
			CurrencySymbol:        currencySymbol,
			CurrencyDecimalPlaces: decimalPlaces,
			OwnerType:             "company",
			OwnerName:             "Company",
			IsActive:              account.IsActive,
			CreatedAt:             account.CreatedAt,
			UpdatedAt:             account.UpdatedAt,
		})
	}

	var customerBanks []customerModels.CustomerBank
	if err := r.db.WithContext(ctx).
		Preload("Bank").
		Preload("Currency").
		Joins("JOIN customers ON customers.id = customer_banks.customer_id AND customers.deleted_at IS NULL").
		Find(&customerBanks).Error; err != nil {
		return nil, 0, err
	}
	for _, bank := range customerBanks {
		var owner struct {
			ID   string
			Code string
			Name string
		}
		if err := r.db.WithContext(ctx).Table("customers").Select("id, code, name").Where("id = ?", bank.CustomerID).Scan(&owner).Error; err != nil {
			return nil, 0, err
		}
		bankName := ""
		bankCode := ""
		if bank.Bank != nil {
			bankName = bank.Bank.Name
			bankCode = bank.Bank.Code
		}
		var decimalPlaces *int
		var currencyName *string
		var currencySymbol *string
		var currencyCode string
		if bank.Currency != nil {
			decimalPlaces = &bank.Currency.DecimalPlaces
			currencyName = &bank.Currency.Name
			currencySymbol = &bank.Currency.Symbol
			currencyCode = bank.Currency.Code
		}
		ownerID := owner.ID
		ownerCode := owner.Code
		items = append(items, UnifiedBankAccount{
			ID:                    bank.ID,
			SourceType:            "customer",
			Name:                  firstNonEmpty(bankName, bank.AccountName),
			BankName:              stringPtrIfNotEmpty(bankName),
			BankCode:              stringPtrIfNotEmpty(bankCode),
			AccountNumber:         bank.AccountNumber,
			AccountHolder:         bank.AccountName,
			CurrencyID:            bank.CurrencyID,
			CurrencyCode:          currencyCode,
			CurrencyName:          currencyName,
			CurrencySymbol:        currencySymbol,
			CurrencyDecimalPlaces: decimalPlaces,
			OwnerType:             "customer",
			OwnerID:               &ownerID,
			OwnerName:             owner.Name,
			OwnerCode:             &ownerCode,
			IsActive:              true,
			CreatedAt:             bank.CreatedAt,
			UpdatedAt:             bank.UpdatedAt,
		})
	}

	var supplierBanks []supplierModels.SupplierBank
	if err := r.db.WithContext(ctx).
		Preload("Bank").
		Preload("Currency").
		Joins("JOIN suppliers ON suppliers.id = supplier_banks.supplier_id AND suppliers.deleted_at IS NULL").
		Find(&supplierBanks).Error; err != nil {
		return nil, 0, err
	}
	for _, bank := range supplierBanks {
		var owner struct {
			ID   string
			Code string
			Name string
		}
		if err := r.db.WithContext(ctx).Table("suppliers").Select("id, code, name").Where("id = ?", bank.SupplierID).Scan(&owner).Error; err != nil {
			return nil, 0, err
		}
		bankName := ""
		bankCode := ""
		if bank.Bank != nil {
			bankName = bank.Bank.Name
			bankCode = bank.Bank.Code
		}
		var decimalPlaces *int
		var currencyName *string
		var currencySymbol *string
		var currencyCode string
		if bank.Currency != nil {
			decimalPlaces = &bank.Currency.DecimalPlaces
			currencyName = &bank.Currency.Name
			currencySymbol = &bank.Currency.Symbol
			currencyCode = bank.Currency.Code
		}
		ownerID := owner.ID
		ownerCode := owner.Code
		items = append(items, UnifiedBankAccount{
			ID:                    bank.ID,
			SourceType:            "supplier",
			Name:                  firstNonEmpty(bankName, bank.AccountName),
			BankName:              stringPtrIfNotEmpty(bankName),
			BankCode:              stringPtrIfNotEmpty(bankCode),
			AccountNumber:         bank.AccountNumber,
			AccountHolder:         bank.AccountName,
			CurrencyID:            bank.CurrencyID,
			CurrencyCode:          currencyCode,
			CurrencyName:          currencyName,
			CurrencySymbol:        currencySymbol,
			CurrencyDecimalPlaces: decimalPlaces,
			OwnerType:             "supplier",
			OwnerID:               &ownerID,
			OwnerName:             owner.Name,
			OwnerCode:             &ownerCode,
			IsActive:              true,
			CreatedAt:             bank.CreatedAt,
			UpdatedAt:             bank.UpdatedAt,
		})
	}

	if search := strings.ToLower(strings.TrimSpace(params.Search)); search != "" {
		filtered := make([]UnifiedBankAccount, 0, len(items))
		for _, item := range items {
			if strings.Contains(strings.ToLower(item.Name), search) ||
				strings.Contains(strings.ToLower(item.AccountNumber), search) ||
				strings.Contains(strings.ToLower(item.AccountHolder), search) ||
				strings.Contains(strings.ToLower(item.OwnerName), search) ||
				(item.BankName != nil && strings.Contains(strings.ToLower(*item.BankName), search)) {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}

	if ownerType := strings.ToLower(strings.TrimSpace(params.OwnerType)); ownerType != "" {
		filtered := make([]UnifiedBankAccount, 0, len(items))
		for _, item := range items {
			if strings.EqualFold(item.OwnerType, ownerType) {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}

	if currencyID := strings.TrimSpace(params.CurrencyID); currencyID != "" {
		filtered := make([]UnifiedBankAccount, 0, len(items))
		for _, item := range items {
			if item.CurrencyID != nil && *item.CurrencyID == currencyID {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}

	sortDir := strings.ToLower(strings.TrimSpace(params.SortDir))
	if sortDir != "asc" {
		sortDir = "desc"
	}
	sort.Slice(items, func(i, j int) bool {
		left := items[i]
		right := items[j]
		var result bool
		switch params.SortBy {
		case "name":
			result = left.Name < right.Name
		case "owner_name":
			result = left.OwnerName < right.OwnerName
		case "currency":
			result = left.CurrencyCode < right.CurrencyCode
		default:
			result = left.CreatedAt.Before(right.CreatedAt)
		}
		if sortDir == "asc" {
			return result
		}
		return !result
	})

	total := int64(len(items))
	start := params.Offset
	if start > len(items) {
		start = len(items)
	}
	end := len(items)
	if params.Limit > 0 && start+params.Limit < end {
		end = start + params.Limit
	}

	return items[start:end], total, nil
}

func (r *bankAccountRepository) ListTransactionHistory(ctx context.Context, bankAccountID string, limit int) ([]BankAccountTransaction, error) {
	items, _, err := r.ListTransactionHistoryPaginated(ctx, bankAccountID, limit, 0)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *bankAccountRepository) ListTransactionHistoryPaginated(ctx context.Context, bankAccountID string, limit, offset int) ([]BankAccountTransaction, int64, error) {
	if limit <= 0 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	const baseQuery = `
		FROM (
			SELECT
				p.id,
				'payment' AS transaction_type,
				p.payment_date::timestamp AS transaction_date,
				'PAYMENT' AS reference_type,
				p.id AS reference_id,
				NULL::text AS reference_number,
				NULL::text AS related_entity_type,
				NULL::text AS related_entity_id,
				NULL::text AS related_entity_label,
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
				'CASH_BANK_JOURNAL' AS reference_type,
				cbj.id AS reference_id,
				NULL::text AS reference_number,
				NULL::text AS related_entity_type,
				NULL::text AS related_entity_id,
				NULL::text AS related_entity_label,
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
				'SALES_PAYMENT' AS reference_type,
				sp.id AS reference_id,
				COALESCE(sp.reference_number, ci.invoice_number, ci.code) AS reference_number,
				'customer' AS related_entity_type,
				so.customer_id::text AS related_entity_id,
				COALESCE(so.customer_name, '') AS related_entity_label,
				sp.amount AS amount,
				sp.status::text AS status,
				COALESCE(sp.notes, '') AS description
			FROM sales_payments sp
			LEFT JOIN customer_invoices ci ON ci.id = sp.customer_invoice_id
			LEFT JOIN sales_orders so ON so.id = ci.sales_order_id
			WHERE sp.bank_account_id = ? AND sp.deleted_at IS NULL

			UNION ALL

			SELECT
				pp.id,
				'purchase_payment' AS transaction_type,
				pp.created_at AS transaction_date,
				'PURCHASE_PAYMENT' AS reference_type,
				pp.id AS reference_id,
				COALESCE(pp.reference_number, si.invoice_number, si.code) AS reference_number,
				'supplier' AS related_entity_type,
				si.supplier_id::text AS related_entity_id,
				COALESCE(si.supplier_name_snapshot, '') AS related_entity_label,
				pp.amount AS amount,
				pp.status::text AS status,
				COALESCE(pp.notes, '') AS description
			FROM purchase_payments pp
			LEFT JOIN supplier_invoices si ON si.id = pp.supplier_invoice_id
			WHERE pp.bank_account_id = ? AND pp.deleted_at IS NULL
		) t
	`

	countQuery := `SELECT COUNT(*) ` + baseQuery
	var total int64
	if err := r.db.WithContext(ctx).Raw(countQuery, bankAccountID, bankAccountID, bankAccountID, bankAccountID).Scan(&total).Error; err != nil {
		return nil, 0, err
	}

	const query = `
		SELECT
			t.id,
			t.transaction_type,
			t.transaction_date,
			t.reference_type,
			t.reference_id,
			t.reference_number,
			t.related_entity_type,
			t.related_entity_id,
			t.related_entity_label,
			t.amount,
			t.status,
			t.description
		` + baseQuery + `
		ORDER BY t.transaction_date DESC
		LIMIT ?
		OFFSET ?
	`

	items := make([]BankAccountTransaction, 0)
	if err := r.db.WithContext(ctx).Raw(query, bankAccountID, bankAccountID, bankAccountID, bankAccountID, limit, offset).Scan(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *bankAccountRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.BankAccount{}, "id = ?", id).Error
}

func stringPtrIfNotEmpty(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
