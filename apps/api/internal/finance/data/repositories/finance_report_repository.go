package repositories

import (
	"context"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

type GLAccountBalance struct {
	ChartOfAccountID string
	OpeningBalance   float64
	DebitTotal       float64
	CreditTotal      float64
	ClosingBalance   float64
}

type FinanceReportRepository interface {
	GetAccountBalances(ctx context.Context, startDate, endDate time.Time) ([]GLAccountBalance, error)
	GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time) ([]financeModels.JournalLine, error)
}

type financeReportRepository struct {
	db *gorm.DB
}

func NewFinanceReportRepository(db *gorm.DB) FinanceReportRepository {
	return &financeReportRepository{db: db}
}

func (r *financeReportRepository) GetAccountBalances(ctx context.Context, startDate, endDate time.Time) ([]GLAccountBalance, error) {
	// 1. Calculate Opening Balance (posted journals before startDate)
	type opRow struct {
		CoAID   string  `gorm:"column:coa_id"`
		Balance float64 `gorm:"column:balance"`
	}
	var ops []opRow
	opQuery := `
		SELECT 
			jl.chart_of_account_id as coa_id,
			SUM(
				CASE 
					WHEN coa.type IN ('ASSET', 'CASH_BANK', 'CURRENT_ASSET', 'FIXED_ASSET', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'SALARY_WAGES', 'OPERATIONAL') THEN jl.debit - jl.credit
					ELSE jl.credit - jl.debit
				END
			) as balance
		FROM journal_lines jl
		JOIN journal_entries je ON je.id = jl.journal_entry_id
		JOIN chart_of_accounts coa ON coa.id = jl.chart_of_account_id
		WHERE je.status = 'posted' AND je.entry_date < ?
		GROUP BY jl.chart_of_account_id
	`
	if err := r.db.WithContext(ctx).Raw(opQuery, startDate).Scan(&ops).Error; err != nil {
		return nil, err
	}
	opMap := make(map[string]float64)
	for _, o := range ops {
		opMap[o.CoAID] = o.Balance
	}

	// 2. Calculate Periodic Movement (posted journals between startDate and endDate)
	type moveRow struct {
		CoAID  string  `gorm:"column:coa_id"`
		Debit  float64 `gorm:"column:debit"`
		Credit float64 `gorm:"column:credit"`
	}
	var moves []moveRow
	moveQuery := `
		SELECT 
			jl.chart_of_account_id as coa_id,
			SUM(jl.debit) as debit,
			SUM(jl.credit) as credit
		FROM journal_lines jl
		JOIN journal_entries je ON je.id = jl.journal_entry_id
		WHERE je.status = 'posted' AND je.entry_date >= ? AND je.entry_date <= ?
		GROUP BY jl.chart_of_account_id
	`
	if err := r.db.WithContext(ctx).Raw(moveQuery, startDate, endDate).Scan(&moves).Error; err != nil {
		return nil, err
	}

	// 3. Combine with CoA list to get all balances
	var allCoas []financeModels.ChartOfAccount
	if err := r.db.WithContext(ctx).Order("code asc").Find(&allCoas).Error; err != nil {
		return nil, err
	}

	moveMap := make(map[string]moveRow)
	for _, m := range moves {
		moveMap[m.CoAID] = m
	}

	res := make([]GLAccountBalance, 0, len(allCoas))
	for _, coa := range allCoas {
		op := opMap[coa.ID]
		mv := moveMap[coa.ID]

		change := 0.0
		switch coa.Type {
		case financeModels.AccountTypeAsset, financeModels.AccountTypeCashBank, financeModels.AccountTypeCurrentAsset, financeModels.AccountTypeFixedAsset,
			financeModels.AccountTypeExpense, financeModels.AccountTypeCOGS, financeModels.AccountTypeSalaryWages, financeModels.AccountTypeOperational:
			change = mv.Debit - mv.Credit
		default:
			change = mv.Credit - mv.Debit
		}

		res = append(res, GLAccountBalance{
			ChartOfAccountID: coa.ID,
			OpeningBalance:   op,
			DebitTotal:       mv.Debit,
			CreditTotal:      mv.Credit,
			ClosingBalance:   op + change,
		})
	}

	return res, nil
}

func (r *financeReportRepository) GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time) ([]financeModels.JournalLine, error) {
	var lines []financeModels.JournalLine
	err := r.db.WithContext(ctx).
		Preload("JournalEntry").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_lines.chart_of_account_id = ?", coaID).
		Where("journal_entries.status = 'posted'").
		Where("journal_entries.entry_date >= ?", startDate).
		Where("journal_entries.entry_date <= ?", endDate).
		Order("journal_entries.entry_date asc, journal_entries.created_at asc").
		Find(&lines).Error
	return lines, err
}
