package usecase

import (
	"context"
	"errors"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func ensureNotClosed(ctx context.Context, tx *gorm.DB, entryDate time.Time) error {
	// First, check for explicit closed accounting periods.
	var period financeModels.AccountingPeriod
	err := tx.WithContext(ctx).
		Where("status = ?", financeModels.AccountingPeriodStatusClosed).
		Where("? BETWEEN start_date AND end_date", entryDate).
		First(&period).Error
	if err == nil {
		return errors.New("period is closed")
	}
	if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}

	// Fallback: older behavior based on financial closings (for backward compatibility)
	var closing financeModels.FinancialClosing
	err = tx.WithContext(ctx).
		Where("status = ?", financeModels.FinancialClosingStatusApproved).
		Order("period_end_date desc").
		First(&closing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil
		}
		return err
	}
	// Prevent entries on/before latest closed period end date.
	if !entryDate.After(closing.PeriodEndDate) {
		return errors.New("period is closed")
	}
	return nil
}
