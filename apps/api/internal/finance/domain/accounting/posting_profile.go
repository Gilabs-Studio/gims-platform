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

	// UseTransactionCOA if true, uses the COA ID provided in TransactionData.TransactionCOAID.
	UseTransactionCOA bool

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

	// ProfileSalesInvoice generates journal for customer invoices.
	// Debit: Trade Receivables (coa.sales_receivable)
	// Credit: Sales Revenue (coa.sales_revenue)
	// Credit: VAT Out (coa.sales_vat_out) if applicable
	ProfileSalesInvoice = PostingProfile{
		ReferenceType:       reference.RefTypeSalesInvoice,
		DescriptionTemplate: "Invoice %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.sales_receivable",
				Side:          "debit",
				AmountSource:  "net_total",
				MemoTemplate:  "Trade Receivables from customer (net of DP)",
			},
			{
				COASettingKey: "coa.sales_advance",
				Side:          "debit",
				AmountSource:  "deposit_total",
				MemoTemplate:  "Applied Down Payment Settlement",
			},
			{
				COASettingKey: "coa.sales_revenue",
				Side:          "credit",
				AmountSource:  "sub_total", // requires engine support for sub_total source
				MemoTemplate:  "Sales Revenue from invoice items",
			},
			{
				COASettingKey: "coa.sales_vat_out",
				Side:          "credit",
				AmountSource:  "tax_total",
				MemoTemplate:  "VAT Output",
			},
			{
				COASettingKey: "coa.sales_cogs",
				Side:          "debit",
				AmountSource:  "cogs_total",
				MemoTemplate:  "COGS Recognition",
			},
			{
				COASettingKey: "coa.sales_inventory",
				Side:          "credit",
				AmountSource:  "cogs_total",
				MemoTemplate:  "Inventory Release",
			},
		},
	}

	// ProfileSupplierInvoice generates journal for supplier invoices.
	// Debit: GR/IR (coa.gr_ir)
	// Credit: Trade Payables (coa.purchase_payable)
	ProfileSupplierInvoice = PostingProfile{
		ReferenceType:       reference.RefTypeSupplierInvoice,
		DescriptionTemplate: "Supplier Invoice %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.purchase_payable",
				Side:          "credit",
				AmountSource:  "net_total",
				MemoTemplate:  "Trade Payables to supplier (net of DP)",
			},
			{
				COASettingKey: "coa.purchase_advance",
				Side:          "credit",
				AmountSource:  "deposit_total",
				MemoTemplate:  "Applied Supplier Advance Settlement",
			},
			{
				COASettingKey: "coa.gr_ir",
				Side:          "debit",
				AmountSource:  "sub_total",
				MemoTemplate:  "Clearing GR/IR for received goods",
			},
			{
				COASettingKey: "coa.purchase_vat_in",
				Side:          "debit",
				AmountSource:  "tax_total",
				MemoTemplate:  "VAT Input",
			},
			{
				COASettingKey: "coa.purchase_expense",
				Side:          "debit",
				AmountSource:  "other_total",
				MemoTemplate:  "Delivery/Other Costs",
			},
		},
	}

	// ProfileSalesPayment generates journal for regular customer payments.
	ProfileSalesPayment = PostingProfile{
		ReferenceType:       reference.RefTypeSalesPayment,
		DescriptionTemplate: "Customer Payment %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.sales_receivable",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Payment for Regular Invoice",
			},
			{
				UseTransactionCOA: true,
				Side:              "debit",
				AmountSource:      "total",
				MemoTemplate:      "Inbound Payment to Bank/Cash",
			},
		},
	}

	// ProfileSalesPaymentDP generates journal for down payment payments.
	ProfileSalesPaymentDP = PostingProfile{
		ReferenceType:       reference.RefTypeSalesPayment,
		DescriptionTemplate: "Customer Down Payment %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.sales_advance",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Customer Advance Payment",
			},
			{
				UseTransactionCOA: true,
				Side:              "debit",
				AmountSource:      "total",
				MemoTemplate:      "Inbound Payment to Bank/Cash",
			},
		},
	}

	// ProfileSalesInvoiceDP generates journal for customer down payment invoice approval.
	ProfileSalesInvoiceDP = PostingProfile{
		ReferenceType:       "SALES_INVOICE_DP",
		DescriptionTemplate: "Customer DP Invoice %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.sales_receivable",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Trade Receivable DP",
			},
			{
				COASettingKey: "coa.sales_advance",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Customer Advance Liability",
			},
		},
	}

	// ProfileSupplierInvoiceDP generates journal for supplier down payment invoice approval.
	ProfileSupplierInvoiceDP = PostingProfile{
		ReferenceType:       "SUPPLIER_INVOICE_DP",
		DescriptionTemplate: "Supplier DP Invoice %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.purchase_payable",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Trade Payable DP",
			},
			{
				COASettingKey: "coa.purchase_advance",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Supplier Advance Asset",
			},
		},
	}

	// ProfileSalesReturn generates journal for sales return processing.
	ProfileSalesReturn = PostingProfile{
		ReferenceType:       "SALES_RETURN",
		DescriptionTemplate: "Sales Return %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.sales_receivable",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "A/R Adjustment for Return",
			},
			{
				COASettingKey: "coa.sales_return",
				Side:          "debit",
				AmountSource:  "sub_total",
				MemoTemplate:  "Sales Return Recognition",
			},
			{
				COASettingKey: "coa.sales_vat_out",
				Side:          "debit",
				AmountSource:  "tax_total",
				MemoTemplate:  "VAT Out Reversal for Return",
			},
		},
	}

	// ProfilePurchaseReturn generates journal for purchase return processing.
	ProfilePurchaseReturn = PostingProfile{
		ReferenceType:       "PURCHASE_RETURN",
		DescriptionTemplate: "Purchase Return %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.purchase_payable",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "A/P Adjustment for Return",
			},
			{
				COASettingKey: "coa.purchase_return",
				Side:          "credit",
				AmountSource:  "sub_total",
				MemoTemplate:  "Purchase Return Recognition",
			},
			{
				COASettingKey: "coa.purchase_vat_in",
				Side:          "credit",
				AmountSource:  "tax_total",
				MemoTemplate:  "VAT In Reversal for Return",
			},
		},
	}

	// ProfilePurchasePayment generates journal for regular supplier payments.
	ProfilePurchasePayment = PostingProfile{
		ReferenceType:       "PURCHASE_PAYMENT",
		DescriptionTemplate: "Supplier Payment %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.purchase_payable",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Payment for Regular Invoice",
			},
			{
				COASource:    "bank_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "Outbound Payment from Bank/Cash",
			},
		},
	}

	// ProfilePurchasePaymentDP generates journal for supplier down payments.
	ProfilePurchasePaymentDP = PostingProfile{
		ReferenceType:       "PURCHASE_PAYMENT_DP",
		DescriptionTemplate: "Supplier Down Payment %s: %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.purchase_advance",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Supplier Advance Payment",
			},
			{
				COASource:    "bank_account",
				Side:         "credit",
				AmountSource: "total",
				MemoTemplate: "Outbound Payment from Bank/Cash",
			},
		},
	}

	// ProfileGoodsReceipt generates accrual journal when goods are received.
	ProfileGoodsReceipt = PostingProfile{
		ReferenceType:       "GOODS_RECEIPT",
		DescriptionTemplate: "Stock Accrual for GR %s",
		Rules: []PostingRule{
			{
				COASettingKey: "coa.inventory",
				Side:          "debit",
				AmountSource:  "total",
				MemoTemplate:  "Inventory Increase from GR",
			},
			{
				COASettingKey: "coa.gr_ir",
				Side:          "credit",
				AmountSource:  "total",
				MemoTemplate:  "Accrued Liability (GR/IR)",
			},
		},
	}
)
