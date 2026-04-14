package repositories

import (
	"context"
	"strings"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type BankTransferListParams struct {
	CompanyID         string
	FromBankAccountID string
	ToBankAccountID   string
	Status            *financeModels.BankTransferStatus
	StartDate         *time.Time
	EndDate           *time.Time
	Search            string
	SortBy            string
	SortDir           string
	Limit             int
	Offset            int
}

type BankTransferRepository interface {
	Create(ctx context.Context, item *financeModels.BankTransfer) error
	FindByID(ctx context.Context, id string) (*financeModels.BankTransfer, error)
	List(ctx context.Context, params BankTransferListParams) ([]financeModels.BankTransfer, int64, error)
	Update(ctx context.Context, item *financeModels.BankTransfer) error
}

type bankTransferRepository struct {
	db *gorm.DB
}

func NewBankTransferRepository(db *gorm.DB) BankTransferRepository {
	return &bankTransferRepository{db: db}
}

func (r *bankTransferRepository) Create(ctx context.Context, item *financeModels.BankTransfer) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *bankTransferRepository) FindByID(ctx context.Context, id string) (*financeModels.BankTransfer, error) {
	var item financeModels.BankTransfer
	if err := r.db.WithContext(ctx).First(&item, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

var bankTransferAllowedSort = map[string]string{
	"created_at": "bank_transfers.created_at",
	"updated_at": "bank_transfers.updated_at",
	"date":       "bank_transfers.date",
	"amount":     "bank_transfers.amount",
	"status":     "bank_transfers.status",
}

func (r *bankTransferRepository) List(ctx context.Context, params BankTransferListParams) ([]financeModels.BankTransfer, int64, error) {
	var items []financeModels.BankTransfer
	var total int64

	q := r.db.WithContext(ctx).Model(&financeModels.BankTransfer{})

	if companyID := strings.TrimSpace(params.CompanyID); companyID != "" {
		q = q.Where("company_id = ?", companyID)
	}
	if fromID := strings.TrimSpace(params.FromBankAccountID); fromID != "" {
		q = q.Where("from_bank_account_id = ?", fromID)
	}
	if toID := strings.TrimSpace(params.ToBankAccountID); toID != "" {
		q = q.Where("to_bank_account_id = ?", toID)
	}
	if params.Status != nil {
		q = q.Where("status = ?", *params.Status)
	}
	if params.StartDate != nil {
		q = q.Where("date >= ?", *params.StartDate)
	}
	if params.EndDate != nil {
		q = q.Where("date <= ?", *params.EndDate)
	}
	if search := strings.TrimSpace(params.Search); search != "" {
		like := "%" + search + "%"
		q = q.Where("transfer_number ILIKE ? OR reference ILIKE ? OR description ILIKE ?", like, like, like)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	sortCol := bankTransferAllowedSort[params.SortBy]
	if sortCol == "" {
		sortCol = bankTransferAllowedSort["date"]
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

func (r *bankTransferRepository) Update(ctx context.Context, item *financeModels.BankTransfer) error {
	return r.db.WithContext(ctx).Save(item).Error
}
