package repositories

import (
	"context"
	"fmt"
	"strings"
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
	GetAccountBalances(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]GLAccountBalance, error)
	GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time, companyID *string) ([]financeModels.JournalLine, error)
	GetNetProfit(ctx context.Context, startDate, endDate time.Time, companyID *string) (float64, error)
}

type financeReportRepository struct {
	db *gorm.DB
}

func NewFinanceReportRepository(db *gorm.DB) FinanceReportRepository {
	return &financeReportRepository{db: db}
}

func normalizeCompanyID(companyID *string) *string {
	if companyID == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*companyID)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (r *financeReportRepository) validateCompanyFilterSupport(ctx context.Context, companyID *string) error {
	if companyID == nil {
		return nil
	}
	hasColumn := r.db.WithContext(ctx).Migrator().HasColumn(&financeModels.JournalEntry{}, "company_id")
	if !hasColumn {
		return fmt.Errorf("company_id filter is not supported: journal_entries.company_id column not found")
	}
	return nil
}

func (r *financeReportRepository) GetAccountBalances(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]GLAccountBalance, error) {
	companyID = normalizeCompanyID(companyID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return nil, err
	}

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
		WHERE je.status IN ('posted', 'reversed')
			AND je.entry_date < ?
			AND je.deleted_at IS NULL
			AND jl.deleted_at IS NULL
			AND coa.deleted_at IS NULL
	`
	opArgs := []interface{}{startDate}
	if companyID != nil {
		opQuery += `
			AND je.company_id = ?
		`
		opArgs = append(opArgs, *companyID)
	}
	opQuery += `
		GROUP BY jl.chart_of_account_id
	`
	if err := r.db.WithContext(ctx).Raw(opQuery, opArgs...).Scan(&ops).Error; err != nil {
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
		WHERE je.status IN ('posted', 'reversed')
			AND je.entry_date >= ?
			AND je.entry_date <= ?
			AND je.deleted_at IS NULL
			AND jl.deleted_at IS NULL
	`
	moveArgs := []interface{}{startDate, endDate}
	if companyID != nil {
		moveQuery += `
			AND je.company_id = ?
		`
		moveArgs = append(moveArgs, *companyID)
	}
	moveQuery += `
		GROUP BY jl.chart_of_account_id
	`
	if err := r.db.WithContext(ctx).Raw(moveQuery, moveArgs...).Scan(&moves).Error; err != nil {
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

func (r *financeReportRepository) GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time, companyID *string) ([]financeModels.JournalLine, error) {
	companyID = normalizeCompanyID(companyID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return nil, err
	}

	var lines []financeModels.JournalLine
	query := r.db.WithContext(ctx).
		Preload("JournalEntry").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_lines.chart_of_account_id = ?", coaID).
		Where("journal_entries.status IN ('posted', 'reversed')").
		Where("journal_entries.deleted_at IS NULL").
		Where("journal_lines.deleted_at IS NULL").
		Where("journal_entries.entry_date >= ?", startDate).
		Where("journal_entries.entry_date <= ?", endDate)
	if companyID != nil {
		query = query.Where("journal_entries.company_id = ?", *companyID)
	}
	err := query.
		Order("journal_entries.entry_date asc, journal_entries.id asc, journal_lines.id asc").
		Find(&lines).Error
	return lines, err
}

func (r *financeReportRepository) GetNetProfit(ctx context.Context, startDate, endDate time.Time, companyID *string) (float64, error) {
	companyID = normalizeCompanyID(companyID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return 0, err
	}

	type result struct {
		NetProfit float64 `gorm:"column:net_profit"`
	}

	query := `
		SELECT COALESCE(SUM(
			CASE
				WHEN coa.type = 'REVENUE' THEN jl.credit - jl.debit
				WHEN coa.type IN ('EXPENSE', 'COST_OF_GOODS_SOLD', 'SALARY_WAGES', 'OPERATIONAL') THEN jl.credit - jl.debit
				ELSE 0
			END
		), 0) AS net_profit
		FROM journal_lines jl
		JOIN journal_entries je ON je.id = jl.journal_entry_id
		JOIN chart_of_accounts coa ON coa.id = jl.chart_of_account_id
		WHERE je.status IN ('posted', 'reversed')
			AND je.entry_date >= ?
			AND je.entry_date <= ?
			AND je.deleted_at IS NULL
			AND jl.deleted_at IS NULL
			AND coa.deleted_at IS NULL
	`
	args := []interface{}{startDate, endDate}
	if companyID != nil {
		query += ` AND je.company_id = ?`
		args = append(args, *companyID)
	}

	var row result
	if err := r.db.WithContext(ctx).Raw(query, args...).Scan(&row).Error; err != nil {
		return 0, err
	}

	return row.NetProfit, nil
}
