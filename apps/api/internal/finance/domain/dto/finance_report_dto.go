package dto

import (
	"time"
)

type GLTransactionRow struct {
	ID            string    `json:"id"`
	JournalID     string    `json:"journal_id"`
	EntryDate     time.Time `json:"entry_date"`
	Description   string    `json:"description"`
	ReferenceType *string   `json:"reference_type"`
	ReferenceID   *string   `json:"reference_id"`
	Debit         float64   `json:"debit"`
	Credit        float64   `json:"credit"`
	Balance       float64   `json:"balance"`
}

type GeneralLedgerAccount struct {
	ChartOfAccountID string             `json:"chart_of_account_id"`
	Code             string             `json:"code"`
	Name             string             `json:"name"`
	AccountType      string             `json:"account_type"`
	OpeningBalance   float64            `json:"opening_balance"`
	ClosingBalance   float64            `json:"closing_balance"`
	Transactions     []GLTransactionRow `json:"transactions"`
}

type GeneralLedgerResponse struct {
	StartDate time.Time              `json:"start_date"`
	EndDate   time.Time              `json:"end_date"`
	Accounts  []GeneralLedgerAccount `json:"accounts"`
}

type ReportRow struct {
	Code    string  `json:"code"`
	Name    string  `json:"name"`
	Amount  float64 `json:"amount"`
	IsTotal bool    `json:"is_total"`
}

type BalanceSheetResponse struct {
	Date            time.Time   `json:"date"`
	Assets          []ReportRow `json:"assets"`
	AssetTotal      float64     `json:"asset_total"`
	Liabilities     []ReportRow `json:"liabilities"`
	LiabilityTotal  float64     `json:"liability_total"`
	Equities        []ReportRow `json:"equities"`
	EquityTotal     float64     `json:"equity_total"`
	LiabilityEquity float64     `json:"liability_equity_total"`
}

type ProfitAndLossResponse struct {
	StartDate    time.Time   `json:"start_date"`
	EndDate      time.Time   `json:"end_date"`
	Revenues     []ReportRow `json:"revenues"`
	RevenueTotal float64     `json:"revenue_total"`
	Expenses     []ReportRow `json:"expenses"`
	ExpenseTotal float64     `json:"expense_total"`
	NetProfit    float64     `json:"net_profit"`
}
