package repositories

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"context"

	"github.com/gilabs/gims/api/internal/supplier/data/models"
	"gorm.io/gorm"
)

// BankRepository defines the interface for bank data access
type BankRepository interface {
	Create(ctx context.Context, bank *models.Bank) error
	FindByID(ctx context.Context, id string) (*models.Bank, error)
	FindByCode(ctx context.Context, code string) (*models.Bank, error)
	List(ctx context.Context, params ListParams) ([]models.Bank, int64, error)
	Update(ctx context.Context, bank *models.Bank) error
	Delete(ctx context.Context, id string) error
}

type bankRepository struct {
	db *gorm.DB
}

// NewBankRepository creates a new instance of BankRepository
func NewBankRepository(db *gorm.DB) BankRepository {
	return &bankRepository{db: db}
}

func (r *bankRepository) Create(ctx context.Context, bank *models.Bank) error {
	return database.GetDB(ctx, r.db).Create(bank).Error
}

func (r *bankRepository) FindByID(ctx context.Context, id string) (*models.Bank, error) {
	var bank models.Bank
	err := database.GetDB(ctx, r.db).First(&bank, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &bank, nil
}

func (r *bankRepository) FindByCode(ctx context.Context, code string) (*models.Bank, error) {
	var bank models.Bank
	err := database.GetDB(ctx, r.db).First(&bank, "code = ?", code).Error
	if err != nil {
		return nil, err
	}
	return &bank, nil
}

func (r *bankRepository) List(ctx context.Context, params ListParams) ([]models.Bank, int64, error) {
	var banks []models.Bank
	var total int64

	query := database.GetDB(ctx, r.db).Model(&models.Bank{})

	// Apply search filter
	if params.Search != "" {
		search := "%" + params.Search + "%"
		query = query.Where("name ILIKE ? OR code ILIKE ? OR swift_code ILIKE ?", search, search, search)
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
		query = query.Order("is_active DESC, " + order)
	} else {
		query = query.Order("is_active DESC, name ASC")
	}

	// Apply pagination
	if params.Limit > 0 {
		query = query.Limit(params.Limit)
	}
	if params.Offset > 0 {
		query = query.Offset(params.Offset)
	}

	if err := query.Find(&banks).Error; err != nil {
		return nil, 0, err
	}

	return banks, total, nil
}

func (r *bankRepository) Update(ctx context.Context, bank *models.Bank) error {
	return database.GetDB(ctx, r.db).Save(bank).Error
}

func (r *bankRepository) Delete(ctx context.Context, id string) error {
	return database.GetDB(ctx, r.db).Delete(&models.Bank{}, "id = ?", id).Error
}
