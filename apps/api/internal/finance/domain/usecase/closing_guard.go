package usecase

import (
	"context"
	"errors"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func ensureNotClosed(ctx context.Context, tx *gorm.DB, entryDate time.Time) error {
	var closing financeModels.FinancialClosing
	err := tx.WithContext(ctx).
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
