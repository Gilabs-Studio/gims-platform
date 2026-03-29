package repositories

import (
	"context"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type AccountingPeriodRepository interface {
	FindByDate(ctx context.Context, date time.Time) (*financeModels.AccountingPeriod, error)
	Create(ctx context.Context, period *financeModels.AccountingPeriod) error
	UpdateStatus(ctx context.Context, id string, status financeModels.AccountingPeriodStatus, lockedAt *time.Time, lockedBy *string) error
	FindLatestClosed(ctx context.Context) (*financeModels.AccountingPeriod, error)
}

type accountingPeriodRepository struct {
	db *gorm.DB
}

func NewAccountingPeriodRepository(db *gorm.DB) AccountingPeriodRepository {
	return &accountingPeriodRepository{db: db}
}

func (r *accountingPeriodRepository) FindByDate(ctx context.Context, date time.Time) (*financeModels.AccountingPeriod, error) {
	var period financeModels.AccountingPeriod
	if err := r.db.WithContext(ctx).
		Where("start_date <= ? AND end_date >= ?", date, date).
		First(&period).Error; err != nil {
		return nil, err
	}
	return &period, nil
}

func (r *accountingPeriodRepository) Create(ctx context.Context, period *financeModels.AccountingPeriod) error {
	return r.db.WithContext(ctx).Create(period).Error
}

func (r *accountingPeriodRepository) UpdateStatus(ctx context.Context, id string, status financeModels.AccountingPeriodStatus, lockedAt *time.Time, lockedBy *string) error {
	updates := map[string]interface{}{"status": status}
	if lockedAt != nil {
		updates["locked_at"] = lockedAt
	}
	if lockedBy != nil {
		updates["locked_by"] = lockedBy
	}
	return r.db.WithContext(ctx).Model(&financeModels.AccountingPeriod{}).Where("id = ?", id).Updates(updates).Error
}

func (r *accountingPeriodRepository) FindLatestClosed(ctx context.Context) (*financeModels.AccountingPeriod, error) {
	var period financeModels.AccountingPeriod
	if err := r.db.WithContext(ctx).
		Where("status = ?", financeModels.AccountingPeriodStatusClosed).
		Order("end_date desc").
		First(&period).Error; err != nil {
		return nil, err
	}
	return &period, nil
}
