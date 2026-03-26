package accounting

import (
	"github.com/gilabs/gims/api/internal/finance/domain/reference"
)

// PostingProfile defines the accounting rules for generating journal entries
// from a specific type of finance transaction.
type PostingProfile struct {
	// ReferenceType is the canonical reference type (from reference package).
	ReferenceType string

	// Description template. Use %s placeholders for dynamic values.
	DescriptionTemplate string

	// Rules define the debit/credit line generation logic.
	Rules []PostingRule
}

// PostingRule defines a single journal line within a posting profile.
type PostingRule struct {
	// COASettingKey is the finance_settings key used to resolve the COA code at runtime.
	// If empty, the COA ID must be provided by the transaction itself (e.g. user-selected account).
	COASettingKey string

	// COASource indicates where to get the COA ID if COASettingKey is empty.
	// Possible values: "transaction", "bank_account", "line_item"
	COASource string

	// Side is either "debit" or "credit".
	Side string

	// AmountSource indicates which amount field to use.
	// Possible values: "total", "line_amount", "item_total"
	AmountSource string

	// MemoTemplate is the memo text template for this line.
	MemoTemplate string
}

// Predefined posting profiles for standard finance transactions.
var (
	// ProfileNonTradePayableApproval generates journal on NTP approval.
	// Debit: Expense Account (transaction.ChartOfAccountID)
	// Credit: NTP Liability Account (from settings)
	ProfileNonTradePayableApproval = PostingProfile{
		ReferenceType:       reference.RefTypeNonTradePayable,
		DescriptionTemplate: "NTP Approval: %s - %s",
		Rules: []PostingRule{
			{
				COASource:    "transaction",
				Side:         "debit",
				AmountSource: "total",
				MemoTemplate: "%s",
			},
			{
				COASettingKey: "coa.non_trade_payable",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Payable record",
			},
		},
	}

	// ProfileNonTradePayablePayment generates journal on NTP payment.
	// Debit: NTP Liability Account (from settings) — settling payable
	// Credit: Bank/Cash Account (user-selected)
	ProfileNonTradePayablePayment = PostingProfile{
		ReferenceType:       reference.RefTypeNTPPayment,
		DescriptionTemplate: "NTP Payment: %s - Ref: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.non_trade_payable",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Settling payable",
			},
			{
				COASource:    "payment_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "%s",
			},
		},
	}

	// ProfileUpCountryApproval generates journal on up-country cost manager approval.
	// Debit: Travel Expense Account (from settings)
	// Credit: Accrued Expense Account (from settings)
	ProfileUpCountryApproval = PostingProfile{
		ReferenceType:       reference.RefTypeUpCountryCost,
		DescriptionTemplate: "Up-Country Cost Approval: %s - %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.travel_expense",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Travel Expense",
			},
			{
				COASettingKey: "coa.accrued_expense",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Reimbursement payable",
			},
		},
	}

	// ProfileCashBankCashIn generates journal for cash-in transactions.
	// Debit: Bank Account COA (from bank_account.chart_of_account_id)
	// Credit: Counter-party accounts (line items)
	ProfileCashBankCashIn = PostingProfile{
		ReferenceType:       reference.RefTypeCashBank,
		DescriptionTemplate: "%s",
		Rules: []PostingRule{
			{
				COASource:    "bank_account",
				Side:         "debit",
				AmountSource: "total",
				MemoTemplate: "Cash/Bank inflow",
			},
			// Line items are generated dynamically per cash bank journal line
		},
	}

	// ProfileCashBankCashOut generates journal for cash-out transactions.
	// Debit: Counter-party accounts (line items)
	// Credit: Bank Account COA (from bank_account.chart_of_account_id)
	ProfileCashBankCashOut = PostingProfile{
		ReferenceType:       reference.RefTypeCashBank,
		DescriptionTemplate: "%s",
		Rules: []PostingRule{
			{
				COASource:    "bank_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "Cash/Bank outflow",
			},
		},
	}

	// ProfileCashBankTransfer generates journal for inter-bank transfers.
	// Debit: Destination bank accounts (line items)
	// Credit: Source Bank Account COA
	ProfileCashBankTransfer = PostingProfile{
		ReferenceType:       reference.RefTypeCashBank,
		DescriptionTemplate: "%s",
		Rules: []PostingRule{
			{
				COASource:    "bank_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "Inter-bank transfer out",
			},
		},
	}

	// ProfilePayment generates journal on payment approval.
	// Debit: Allocation accounts (line items)
	// Credit: Bank Account COA
	ProfilePayment = PostingProfile{
		ReferenceType:       reference.RefTypePayment,
		DescriptionTemplate: "%s",
		Rules: []PostingRule{
			{
				COASource:    "bank_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "Payment bank outflow",
			},
		},
	}

	// ProfilePeriodClosing generates year-end closing journal.
	// Debit/Credit: Revenue/Expense summary → Retained Earnings
	ProfilePeriodClosing = PostingProfile{
		ReferenceType:       reference.RefTypePeriodClosing,
		DescriptionTemplate: "Year-End Closing: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.retained_earnings",
				Side:          "dynamic", // determined at runtime based on net income sign
				AmountSource:  "calculated",
				MemoTemplate:  "Year-end closing transfer",
			},
		},
	}
)
