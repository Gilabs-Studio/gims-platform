package repositories

import (
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
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
	GetAccountBalancesByAccounts(ctx context.Context, accountIDs []string, startDate, endDate time.Time, companyID, fiscalYearID *string) (map[string]GLAccountBalance, error)
	GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time, companyID, fiscalYearID *string) ([]financeModels.JournalLine, error)
	GetNetProfit(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (float64, error)
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

func normalizeFiscalYearID(fiscalYearID *string) *string {
	if fiscalYearID == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*fiscalYearID)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (r *financeReportRepository) validateCompanyFilterSupport(ctx context.Context, companyID *string) error {
	if companyID == nil {
		return nil
	}
	hasColumn := database.GetDB(ctx, r.db).Migrator().HasColumn(&financeModels.JournalEntry{}, "company_id")
	if !hasColumn {
		return fmt.Errorf("company_id filter is not supported: journal_entries.company_id column not found")
	}
	return nil
}

func (r *financeReportRepository) validateFiscalYearFilterSupport(ctx context.Context, fiscalYearID *string) error {
	if fiscalYearID == nil {
		return nil
	}
	hasColumn := database.GetDB(ctx, r.db).Migrator().HasColumn(&financeModels.JournalEntry{}, "fiscal_year_id")
	if !hasColumn {
		return fmt.Errorf("fiscal_year_id filter is not supported: journal_entries.fiscal_year_id column not found")
	}
	return nil
}

func (r *financeReportRepository) GetAccountBalancesByAccounts(ctx context.Context, accountIDs []string, startDate, endDate time.Time, companyID, fiscalYearID *string) (map[string]GLAccountBalance, error) {
	companyID = normalizeCompanyID(companyID)
	fiscalYearID = normalizeFiscalYearID(fiscalYearID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return nil, err
	}
	if err := r.validateFiscalYearFilterSupport(ctx, fiscalYearID); err != nil {
		return nil, err
	}

	result := make(map[string]GLAccountBalance, len(accountIDs))
	for _, id := range accountIDs {
		if strings.TrimSpace(id) == "" {
			continue
		}
		result[id] = GLAccountBalance{ChartOfAccountID: id}
	}

	query := database.GetDB(ctx, r.db).
		Table("journal_lines jl").
		Select(`
			jl.chart_of_account_id as coa_id,
			coa.type as account_type,
			COALESCE(SUM(CASE
				WHEN je.entry_date < ? THEN
					CASE
						WHEN coa.type IN ('ASSET', 'CASH_BANK', 'CURRENT_ASSET', 'FIXED_ASSET', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'SALARY_WAGES', 'OPERATIONAL')
						THEN jl.debit - jl.credit
						ELSE jl.credit - jl.debit
					END
				ELSE 0
			END), 0) as opening_balance,
			COALESCE(SUM(CASE WHEN je.entry_date >= ? AND je.entry_date <= ? THEN jl.debit ELSE 0 END), 0) as debit_total,
			COALESCE(SUM(CASE WHEN je.entry_date >= ? AND je.entry_date <= ? THEN jl.credit ELSE 0 END), 0) as credit_total
		`, startDate, startDate, endDate, startDate, endDate).
		Joins("JOIN journal_entries je ON je.id = jl.journal_entry_id").
		Joins("JOIN chart_of_accounts coa ON coa.id = jl.chart_of_account_id").
		Where("je.status = ?", financeModels.JournalStatusPosted).
		Where("je.entry_date <= ?", endDate).
		Where("je.deleted_at IS NULL").
		Where("jl.deleted_at IS NULL").
		Where("coa.deleted_at IS NULL")

	if len(accountIDs) > 0 {
		query = query.Where("jl.chart_of_account_id IN ?", accountIDs)
	}
	if companyID != nil {
		query = query.Where("je.company_id = ?", *companyID)
	}
	if fiscalYearID != nil {
		query = query.Where("je.fiscal_year_id = ?", *fiscalYearID)
	}

	type row struct {
		CoAID          string  `gorm:"column:coa_id"`
		AccountType    string  `gorm:"column:account_type"`
		OpeningBalance float64 `gorm:"column:opening_balance"`
		DebitTotal     float64 `gorm:"column:debit_total"`
		CreditTotal    float64 `gorm:"column:credit_total"`
	}
	rows := make([]row, 0)
	if err := query.Group("jl.chart_of_account_id, coa.type").Scan(&rows).Error; err != nil {
		return nil, err
	}

	for _, rrow := range rows {
		change := 0.0
		switch financeModels.AccountType(rrow.AccountType) {
		case financeModels.AccountTypeAsset, financeModels.AccountTypeCashBank, financeModels.AccountTypeCurrentAsset, financeModels.AccountTypeFixedAsset,
			financeModels.AccountTypeExpense, financeModels.AccountTypeCOGS, financeModels.AccountTypeSalaryWages, financeModels.AccountTypeOperational:
			change = rrow.DebitTotal - rrow.CreditTotal
		default:
			change = rrow.CreditTotal - rrow.DebitTotal
		}

		result[rrow.CoAID] = GLAccountBalance{
			ChartOfAccountID: rrow.CoAID,
			OpeningBalance:   rrow.OpeningBalance,
			DebitTotal:       rrow.DebitTotal,
			CreditTotal:      rrow.CreditTotal,
			ClosingBalance:   rrow.OpeningBalance + change,
		}
	}

	return result, nil
}

func (r *financeReportRepository) GetAccountBalances(ctx context.Context, startDate, endDate time.Time, companyID *string) ([]GLAccountBalance, error) {
	// Keep legacy behavior: return all chart of accounts in code order.
	var allCoas []financeModels.ChartOfAccount
	if err := database.GetDB(ctx, r.db).Order("code asc").Find(&allCoas).Error; err != nil {
		return nil, err
	}
	accountIDs := make([]string, 0, len(allCoas))
	for _, coa := range allCoas {
		accountIDs = append(accountIDs, coa.ID)
	}

	balanceMap, err := r.GetAccountBalancesByAccounts(ctx, accountIDs, startDate, endDate, companyID, nil)
	if err != nil {
		return nil, err
	}

	res := make([]GLAccountBalance, 0, len(allCoas))
	for _, coa := range allCoas {
		if item, ok := balanceMap[coa.ID]; ok {
			res = append(res, item)
			continue
		}
		res = append(res, GLAccountBalance{
			ChartOfAccountID: coa.ID,
			OpeningBalance:   0,
			DebitTotal:       0,
			CreditTotal:      0,
			ClosingBalance:   0,
		})
	}

	return res, nil
}

func (r *financeReportRepository) GetGLAccountTransactions(ctx context.Context, coaID string, startDate, endDate time.Time, companyID, fiscalYearID *string) ([]financeModels.JournalLine, error) {
	companyID = normalizeCompanyID(companyID)
	fiscalYearID = normalizeFiscalYearID(fiscalYearID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return nil, err
	}
	if err := r.validateFiscalYearFilterSupport(ctx, fiscalYearID); err != nil {
		return nil, err
	}

	var lines []financeModels.JournalLine
	query := database.GetDB(ctx, r.db).
		Preload("JournalEntry").
		Joins("JOIN journal_entries ON journal_entries.id = journal_lines.journal_entry_id").
		Where("journal_lines.chart_of_account_id = ?", coaID).
		Where("journal_entries.status = ?", financeModels.JournalStatusPosted).
		Where("journal_entries.deleted_at IS NULL").
		Where("journal_lines.deleted_at IS NULL").
		Where("journal_entries.entry_date >= ?", startDate).
		Where("journal_entries.entry_date <= ?", endDate)
	if companyID != nil {
		query = query.Where("journal_entries.company_id = ?", *companyID)
	}
	if fiscalYearID != nil {
		query = query.Where("journal_entries.fiscal_year_id = ?", *fiscalYearID)
	}
	err := query.
		Order("journal_entries.entry_date asc, journal_entries.id asc, journal_lines.id asc").
		Find(&lines).Error
	return lines, err
}

func (r *financeReportRepository) GetNetProfit(ctx context.Context, startDate, endDate time.Time, companyID, fiscalYearID *string) (float64, error) {
	companyID = normalizeCompanyID(companyID)
	fiscalYearID = normalizeFiscalYearID(fiscalYearID)
	if err := r.validateCompanyFilterSupport(ctx, companyID); err != nil {
		return 0, err
	}
	if err := r.validateFiscalYearFilterSupport(ctx, fiscalYearID); err != nil {
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
		WHERE je.status = 'posted'
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
	if fiscalYearID != nil {
		query += ` AND je.fiscal_year_id = ?`
		args = append(args, *fiscalYearID)
	}

	var row result
	if err := database.GetDB(ctx, r.db).Raw(query, args...).Scan(&row).Error; err != nil {
		return 0, err
	}

	return row.NetProfit, nil
}
