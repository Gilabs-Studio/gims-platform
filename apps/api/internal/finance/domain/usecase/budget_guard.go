package usecase

import (
	"context"
	"fmt"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

// EnsureWithinBudget checks if the proposed amount for a specific COA and date is within the approved budget.
func EnsureWithinBudget(ctx context.Context, tx *gorm.DB, coaID string, entryDate time.Time, amount float64) error {
	if amount <= 0 {
		return nil
	}

	// 1. Find an approved budget that covers the entry date
	var budget financeModels.Budget
	err := tx.WithContext(ctx).
		Where("status = ?", financeModels.BudgetStatusApproved).
		Where("start_date <= ? AND end_date >= ?", entryDate, entryDate).
		First(&budget).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If no budget is defined/approved for this period, we allow it (or we could force budgets).
			// For this ERP, let's assume no budget means no restriction.
			return nil
		}
		return err
	}

	// 2. Find the budget item for this specific COA
	var budgetItem financeModels.BudgetItem
	err = tx.WithContext(ctx).
		Where("budget_id = ? AND chart_of_account_id = ?", budget.ID, coaID).
		First(&budgetItem).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If COA is not in the budget, it's considered "Unbudgeted Expense".
			// Standard ERP usually blocks this if a budget exists for the period.
			return fmt.Errorf("account is not budgeted for period %s - %s",
				budget.StartDate.Format("2006-01-02"), budget.EndDate.Format("2006-01-02"))
		}
		return err
	}

	// 3. Calculate actual spent from Journal Entries (Posted)
	type sumResult struct{ Total float64 }
	var actual sumResult
	err = tx.Table("journal_lines").
		Select("SUM(journal_lines.debit - journal_lines.credit) as total").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_lines.chart_of_account_id = ?", coaID).
		Where("journal_entries.status = ?", financeModels.JournalStatusPosted).
		Where("journal_entries.entry_date BETWEEN ? AND ?", budget.StartDate, budget.EndDate).
		Scan(&actual).Error

	if err != nil {
		return err
	}

	// 4. Validate: Actual + Proposed <= Budgeted
	if actual.Total+amount > budgetItem.Amount+0.0001 {
		return fmt.Errorf("budget exceeded for account. Budget: %.2f, Already Spent: %.2f, Requested: %.2f",
			budgetItem.Amount, actual.Total, amount)
	}

	return nil
}
