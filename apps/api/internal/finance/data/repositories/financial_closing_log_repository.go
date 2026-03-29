package repositories

import (
	"context"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type FinancialClosingLogRepository interface {
	Create(ctx context.Context, log *financeModels.FinancialClosingLog) error
}

type financialClosingLogRepository struct {
	db *gorm.DB
}

func NewFinancialClosingLogRepository(db *gorm.DB) FinancialClosingLogRepository {
	return &financialClosingLogRepository{db: db}
}

func (r *financialClosingLogRepository) Create(ctx context.Context, log *financeModels.FinancialClosingLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}
