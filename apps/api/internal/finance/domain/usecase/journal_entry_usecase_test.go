package usecase

import (
	"context"
	"testing"
	"time"

	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/gilabs/gims/api/internal/finance/data/repositories"
	"github.com/gilabs/gims/api/internal/finance/domain/dto"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestValidateLines_ShouldRejectUnbalancedEntries(t *testing.T) {
	t.Parallel()

	_, _, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 100, Credit: 0},
		{ChartOfAccountID: "coa-2", Debit: 0, Credit: 90},
	})

	require.ErrorIs(t, err, ErrJournalUnbalanced)
}

func TestJournalReferenceTypesForDomain_ShouldMapKnownDomain(t *testing.T) {
	t.Parallel()

	domain := "purchase"
	types := journalReferenceTypesForDomain(&domain)

	require.Contains(t, types, "GOODS_RECEIPT")
	require.Contains(t, types, "SUPPLIER_INVOICE")
	require.Contains(t, types, "PURCHASE_PAYMENT")
}

func TestValidateLines_ShouldRejectSingleLine(t *testing.T) {
	t.Parallel()

	_, _, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 100, Credit: 0},
	})

	require.ErrorIs(t, err, ErrJournalInvalidLines)
}

func TestValidateLines_ShouldRejectLineWithBothDebitAndCredit(t *testing.T) {
	t.Parallel()

	_, _, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 100, Credit: 50},
		{ChartOfAccountID: "coa-2", Debit: 0, Credit: 50},
	})

	require.ErrorIs(t, err, ErrJournalInvalidLines)
}

func TestValidateLines_ShouldRejectLineWithZeroDebitAndCredit(t *testing.T) {
	t.Parallel()

	_, _, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 0, Credit: 0},
		{ChartOfAccountID: "coa-2", Debit: 100, Credit: 0},
	})

	require.ErrorIs(t, err, ErrJournalInvalidLines)
}

func TestValidateLines_ShouldPassBalancedEntry(t *testing.T) {
	t.Parallel()

	debit, credit, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 500, Credit: 0},
		{ChartOfAccountID: "coa-2", Debit: 0, Credit: 500},
	})

	require.NoError(t, err)
	require.InDelta(t, 500.0, debit, 0.001)
	require.InDelta(t, 500.0, credit, 0.001)
}

func TestValidateLines_ShouldPassMultiLineBalancedEntry(t *testing.T) {
	t.Parallel()

	debit, credit, err := validateLines([]dto.JournalLineRequest{
		{ChartOfAccountID: "coa-1", Debit: 300, Credit: 0},
		{ChartOfAccountID: "coa-2", Debit: 200, Credit: 0},
		{ChartOfAccountID: "coa-3", Debit: 0, Credit: 500},
	})

	require.NoError(t, err)
	require.InDelta(t, 500.0, debit, 0.001)
	require.InDelta(t, 500.0, credit, 0.001)
}

func TestJournalReferenceTypesForDomain_ShouldMapAdjustmentDomain(t *testing.T) {
	t.Parallel()

	domain := "adjustment"
	types := journalReferenceTypesForDomain(&domain)

	require.Contains(t, types, "MANUAL_ADJUSTMENT")
	require.Contains(t, types, "ADJUSTMENT")
	require.Contains(t, types, "CORRECTION")
}

func TestJournalReferenceTypesForDomain_ShouldMapValuationDomain(t *testing.T) {
	t.Parallel()

	domain := "valuation"
	types := journalReferenceTypesForDomain(&domain)

	require.Contains(t, types, "INVENTORY_VALUATION")
	require.Contains(t, types, "CURRENCY_REVALUATION")
	require.Contains(t, types, "COST_ADJUSTMENT")
}

func TestJournalReferenceTypesForDomain_ShouldReturnNilForNilDomain(t *testing.T) {
	t.Parallel()

	types := journalReferenceTypesForDomain(nil)

	require.Nil(t, types)
}

func TestJournalReferenceTypesForDomain_ShouldReturnNilForUnknownDomain(t *testing.T) {
	t.Parallel()

	domain := "unknown_xyz"
	types := journalReferenceTypesForDomain(&domain)

	require.Nil(t, types)
}

type stubChartOfAccountRepository struct {
	items []financeModels.ChartOfAccount
}

func (s stubChartOfAccountRepository) Create(context.Context, *financeModels.ChartOfAccount) error {
	return nil
}

func (s stubChartOfAccountRepository) FindByID(context.Context, string) (*financeModels.ChartOfAccount, error) {
	return nil, gorm.ErrRecordNotFound
}

func (s stubChartOfAccountRepository) FindAll(context.Context, bool) ([]financeModels.ChartOfAccount, error) {
	return s.items, nil
}

func (s stubChartOfAccountRepository) List(context.Context, repositories.ChartOfAccountListParams) ([]financeModels.ChartOfAccount, int64, error) {
	return s.items, int64(len(s.items)), nil
}

func (s stubChartOfAccountRepository) Update(context.Context, *financeModels.ChartOfAccount) error {
	return nil
}

func (s stubChartOfAccountRepository) Delete(context.Context, string) error {
	return nil
}

func (s stubChartOfAccountRepository) ExistsByCode(context.Context, string, *string) (bool, error) {
	return false, nil
}

func (s stubChartOfAccountRepository) FindByCode(context.Context, string) (*financeModels.ChartOfAccount, error) {
	return nil, gorm.ErrRecordNotFound
}

type stubFinanceReportRepository struct {
	balances []repositories.GLAccountBalance
	lines    []financeModels.JournalLine
}

func (s stubFinanceReportRepository) GetAccountBalances(context.Context, time.Time, time.Time) ([]repositories.GLAccountBalance, error) {
	return s.balances, nil
}

func (s stubFinanceReportRepository) GetGLAccountTransactions(context.Context, string, time.Time, time.Time) ([]financeModels.JournalLine, error) {
	return s.lines, nil
}

func TestFinanceReportUsecase_ShouldAggregateBalanceSheet_FromClosingBalances(t *testing.T) {
	t.Parallel()

	coaRepo := stubChartOfAccountRepository{items: []financeModels.ChartOfAccount{
		{ID: "asset-1", Code: "11100", Name: "Cash", Type: financeModels.AccountTypeAsset},
		{ID: "liab-1", Code: "21100", Name: "Accounts Payable", Type: financeModels.AccountTypeLiability},
		{ID: "equity-1", Code: "31100", Name: "Retained Earnings", Type: financeModels.AccountTypeEquity},
		{ID: "zero-1", Code: "11200", Name: "Unused Asset", Type: financeModels.AccountTypeAsset},
	}}
	reportRepo := stubFinanceReportRepository{balances: []repositories.GLAccountBalance{
		{ChartOfAccountID: "asset-1", ClosingBalance: 1500},
		{ChartOfAccountID: "liab-1", ClosingBalance: 500},
		{ChartOfAccountID: "equity-1", ClosingBalance: 1000},
		{ChartOfAccountID: "zero-1", ClosingBalance: 0},
	}}

	uc := NewFinanceReportUsecase(coaRepo, reportRepo)
	res, err := uc.GetBalanceSheet(context.Background(), time.Now(), time.Now())

	require.NoError(t, err)
	require.Len(t, res.Assets, 1)
	require.Len(t, res.Liabilities, 1)
	require.Len(t, res.Equities, 1)
	require.Equal(t, 1500.0, res.AssetTotal)
	require.Equal(t, 500.0, res.LiabilityTotal)
	require.Equal(t, 1000.0, res.EquityTotal)
	require.Equal(t, 1500.0, res.LiabilityEquity)
}

func TestFinanceReportUsecase_ShouldCalculateProfitAndLoss_FromMovements(t *testing.T) {
	t.Parallel()

	coaRepo := stubChartOfAccountRepository{items: []financeModels.ChartOfAccount{
		{ID: "rev-1", Code: "4100", Name: "Sales Revenue", Type: financeModels.AccountTypeRevenue},
		{ID: "exp-1", Code: "6100", Name: "Operating Expense", Type: financeModels.AccountTypeExpense},
		{ID: "asset-1", Code: "11100", Name: "Cash", Type: financeModels.AccountTypeAsset},
	}}
	reportRepo := stubFinanceReportRepository{balances: []repositories.GLAccountBalance{
		{ChartOfAccountID: "rev-1", DebitTotal: 0, CreditTotal: 1500},
		{ChartOfAccountID: "exp-1", DebitTotal: 300, CreditTotal: 0},
		{ChartOfAccountID: "asset-1", DebitTotal: 1500, CreditTotal: 300},
	}}

	uc := NewFinanceReportUsecase(coaRepo, reportRepo)
	res, err := uc.GetProfitAndLoss(context.Background(), time.Now(), time.Now())

	require.NoError(t, err)
	require.Len(t, res.Revenues, 1)
	require.Len(t, res.Expenses, 1)
	require.Equal(t, 1500.0, res.RevenueTotal)
	require.Equal(t, 300.0, res.ExpenseTotal)
	require.Equal(t, 1200.0, res.NetProfit)
}
