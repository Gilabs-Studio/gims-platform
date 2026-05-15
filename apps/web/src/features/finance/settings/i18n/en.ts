export const financeSettingsEn = {
  title: "Finance Settings",
  description: "Manage finance configuration and account mappings.",
  loading: "Loading...",
  loadFailed: "Failed to load finance settings.",
  required: "Required",
  customKey: "Custom Key",
  missingRequired: "{count} required mapping(s) are missing.",
  selectAccount: "Select account",
  notMapped: "Not mapped",
  noMatchingAccount: "No matching account",
  allowedTypes: "Allowed types",
  selectedTypeMismatch: "Selected account type {type} is not allowed.",
  viewOnly: "View only",
  saving: "Saving...",
  save: "Save",
  dynamicDescription: "Custom finance setting",
  requiredValue: "Please select an account mapping.",
  inventory: {
    title: "Inventory Valuation Settings",
    fields: {
      company: "Company",
      valuationMethod: "Valuation Method",
    },
    placeholders: {
      selectCompany: "Select company",
      selectValuationMethod: "Select valuation method",
    },
    status: {
      loading: "Loading settings...",
      currentLockStatus: "Current lock status: {status}",
      locked: "Locked",
      unlocked: "Unlocked",
    },
    notices: {
      roundingManaged:
        "Rounding adjustment account is managed in Accounting Mapping, not in Inventory Settings. Use the Accounting Mapping page to configure the linked account for inventory adjustments.",
      locked:
        "Inventory settings are locked because inventory transactions already exist. Valuation method can no longer be changed.",
    },
    actions: {
      refresh: "Refresh",
      save: "Save Settings",
    },
    valuationOptions: {
      averageCost: {
        label: "Average Cost",
        description: "Weighted moving average method (required by current finance setup)",
      },
      fifo: {
        label: "FIFO",
        description: "First In First Out",
      },
      specificIdentification: {
        label: "Specific Identification",
        description: "Specific cost per item",
      },
    },
  },
  openingBalance: {
    title: "Opening Balance",
    fields: {
      company: "Company",
      fiscalYear: "Fiscal Year",
      account: "Account",
    },
    placeholders: {
      selectCompany: "Select company",
      selectFiscalYear: "Select fiscal year",
      selectAccount: "Select account",
    },
    summary: {
      title: "One-time Opening Balance",
      description: "Create opening balance once per company and fiscal year.",
      postedJournal: "Posted journal",
    },
    actions: {
      create: "Create Opening Balance",
    },
    wizard: {
      title: "Opening Balance Wizard",
      stepLabel: "Step {step} of 2 - {title}",
      inputLine: "Input line",
      summarySimulation: "Summary & simulation",
      account: "Account",
      debit: "Debit",
      credit: "Credit",
      description: "Description",
      action: "Action",
      addLine: "Add Line",
      draftSaved: "Draft is saved when you click Next",
      difference: "Difference {amount}",
      runningSimulation: "Running simulation...",
      totalDebit: "Total Debit: {amount}",
      totalCredit: "Total Credit: {amount}",
      valuationStatus: "Valuation Status: {status}",
      recommendation: "Recommendation: {value}",
      pending: "PENDING",
      remove: "Remove",
      cancel: "Cancel",
      next: "Next",
      back: "Back",
      close: "Close",
      unknown: "Unknown",
    },
  },
  tax: {
    title: "Tax Configuration",
    fields: {
      company: "Company",
      taxCode: "Tax Code",
      taxName: "Tax Name",
      taxType: "Tax Type",
      rate: "Rate (%)",
      account: "CoA Account",
    },
    placeholders: {
      selectCompany: "Select company",
      selectTaxType: "Select tax type",
      selectAccount: "Select account",
    },
    types: {
      vat: "VAT",
      incomeTax: "Income Tax",
      withholdingTax: "Withholding Tax",
    },
    actions: {
      save: "Save Tax",
    },
    status: {
      loading: "Loading...",
    },
    list: {
      title: "Tax List",
      loading: "Loading...",
      code: "Code",
      name: "Name",
      type: "Type",
      rate: "Rate",
      status: "Status",
      actions: "Actions",
      active: "Active",
      inactive: "Inactive",
      activate: "Activate",
      deactivate: "Deactivate",
      defaultTaxName: "Value Added Tax 11%",
    },
  },
  fiscalYears: {
    company: "Company",
    name: "Fiscal Year Name",
    startDate: "Start Date",
    endDate: "End Date",
    defaultCompanyApplied: "Default company applied",
    loadingCompanies: "Loading companies...",
    selectCompanyPrompt: "Select a company to manage fiscal years.",
    createFiscalYear: "Create Fiscal Year",
    fiscalYearList: "Fiscal Years",
    fiscalYearListDescription: "Manage fiscal year status and lifecycle.",
    fiscalYear: "Fiscal Year",
    period: "Period",
    status: "Status",
    actions: "Actions",
    loadingFiscalYears: "Loading fiscal years...",
    noFiscalYearsFound: "No fiscal years found.",
    confirmDeleteFiscalYear: "Delete fiscal year {name}?",
    periodNote: "Fiscal year period",
    activate: "Activate",
    lock: "Lock",
    delete: "Delete",
    statusValues: {
      draft: "Draft",
      active: "Active",
      locked: "Locked",
    },
  },
  mappingLabels: {
    sales: {
      accounts_receivable: {
        label: "Sales Accounts Receivable",
        description: "Accounts receivable account for sales invoice posting",
      },
      revenue: {
        label: "Sales Revenue",
        description: "Revenue account for sales recognition",
      },
      tax_output: {
        label: "Sales Tax Output",
        description: "Output tax liability account for sales VAT",
      },
      cogs: {
        label: "Sales COGS",
        description: "Cost of goods sold account for inventory issue",
      },
      sales_return: {
        label: "Sales Return",
        description: "Return/contra account for sales return posting",
      },
      advance: {
        label: "Sales Advance",
        description: "Customer advance liability account for down payment posting",
      },
      inventory_asset: {
        label: "Sales Inventory Asset",
        description: "Inventory asset account used by sales COGS movement",
      },
    },
    coa: {
      sales_receivable: {
        label: "Sales Receivable",
        description: "A/R for customer invoices",
      },
      sales_advance: {
        label: "Sales Advance",
        description: "Customer advance liability account for down payment posting",
      },
      sales_revenue: {
        label: "Sales Revenue",
        description: "Revenue account for sales recognition",
      },
      sales_vat_out: {
        label: "Sales VAT Out",
        description: "Output tax liability account for sales VAT",
      },
      sales_cogs: {
        label: "Sales COGS",
        description: "Cost of goods sold account for inventory issue",
      },
      sales_inventory: {
        label: "Sales Inventory",
        description: "Inventory asset account used by sales COGS movement",
      },
      sales_return: {
        label: "Sales Return",
        description: "Return/contra account for sales return posting",
      },
      purchase_payable: {
        label: "Purchase Payable",
        description: "Accounts payable account for supplier invoices",
      },
      accounts_payable: {
        label: "Accounts Payable",
        description: "Accounts payable account for supplier invoices",
      },
      purchase_advance: {
        label: "Purchase Advance",
        description: "Supplier advance asset account for down payment posting",
      },
      purchase_advances: {
        label: "Purchase Advances",
        description: "Supplier advance asset account for down payment posting",
      },
      gr_ir: {
        label: "GR/IR",
        description: "GR/IR clearing account for goods receipt and supplier invoices",
      },
      purchase_gr_ir: {
        label: "Purchase GR/IR",
        description: "GR/IR clearing account for goods receipt and supplier invoices",
      },
      purchase_vat_in: {
        label: "Purchase VAT In",
        description: "Input tax account for purchase VAT",
      },
      purchase_price_diff: {
        label: "Purchase Price Difference",
        description: "Purchase price difference account",
      },
      vat_in: {
        label: "VAT In",
        description: "Input tax account for purchase VAT",
      },
      purchase_expense: {
        label: "Purchase Expense",
        description: "Additional purchase expense account (delivery and other costs)",
      },
      purchase_return: {
        label: "Purchase Return",
        description: "Contra/expense account for purchase return posting",
      },
      inventory: {
        label: "Inventory",
        description: "Inventory asset account for stock movements",
      },
      inventory_asset: {
        label: "Inventory Asset",
        description: "Core inventory asset account for stock movements",
      },
      inventory_gain: {
        label: "Inventory Gain",
        description: "Gain account for positive stock adjustments",
      },
      inventory_loss: {
        label: "Inventory Loss",
        description: "Expense account for negative stock adjustments",
      },
      inventory_revaluation_reserve: {
        label: "Inventory Revaluation Reserve",
        description: "Equity reserve account for inventory revaluation gains",
      },
      cogs: {
        label: "COGS",
        description: "Cost of goods sold account for inventory issue",
      },
      sales_receivable_dp: {
        label: "Customer Advance (DP Customer)",
        description: "Customer advance liability account for down payment posting",
      },
      purchase_payable_dp: {
        label: "Supplier Advance (DP Supplier)",
        description: "Supplier advance liability account for down payment posting",
      },
    },
    purchase: {
      inventory_asset: {
        label: "Purchase Inventory Asset",
        description: "Inventory asset account used by goods receipt posting",
      },
      purchase_advance: {
        label: "Purchase Advance",
        description: "Supplier advance asset account for down payment posting",
      },
      gr_ir_clearing: {
        label: "Purchase GR/IR Clearing",
        description: "GR/IR clearing account for goods receipt and supplier invoices",
      },
      tax_input: {
        label: "Purchase Tax Input",
        description: "Input tax account for purchase VAT",
      },
      accounts_payable: {
        label: "Purchase Accounts Payable",
        description: "Accounts payable account for supplier invoices",
      },
      advance: {
        label: "Purchase Advance",
        description: "Supplier advance asset account for down payment posting",
      },
      purchase_return: {
        label: "Purchase Return",
        description: "Contra/expense account for purchase return posting",
      },
      expense: {
        label: "Purchase Expense",
        description: "Additional purchase expense account (delivery and other costs)",
      },
    },
    inventory: {
      inventory_asset: {
        label: "Inventory Asset",
        description: "Core inventory asset account for stock movements",
      },
      adjustment_gain: {
        label: "Inventory Adjustment Gain",
        description: "Gain account for positive stock adjustments",
      },
      adjustment_loss: {
        label: "Inventory Adjustment Loss",
        description: "Expense account for negative stock adjustments",
      },
      revaluation_reserve: {
        label: "Inventory Revaluation Reserve",
        description: "Equity reserve account for inventory revaluation gains",
      },
    },
    asset: {
      accumulated_depreciation: {
        label: "Accumulated Depreciation",
        description: "Contra asset account for accumulated depreciation",
      },
      depreciation_expense: {
        label: "Depreciation Expense",
        description: "Expense account for periodic depreciation",
      },
    },
    finance: {
      opening_balance_equity: {
        label: "Opening Balance Equity",
        description: "Equity account for opening balance postings",
      },
      bank_default: {
        label: "Default Bank Account",
        description: "Default bank cash account",
      },
      cash_default: {
        label: "Default Cash Account",
        description: "Default cash-on-hand account",
      },
    },
    payroll: {
      salary_expense: {
        label: "Payroll Salary Expense",
        description: "Payroll salary expense account",
      },
      allowance_expense: {
        label: "Payroll Allowance Expense",
        description: "Payroll allowance expense account",
      },
      payable_salary: {
        label: "Payroll Salary Payable",
        description: "Payroll salary payable liability account",
      },
      tax_pph21: {
        label: "Payroll Tax PPh21",
        description: "Payroll tax PPh21 payable account",
      },
    },
  },
};