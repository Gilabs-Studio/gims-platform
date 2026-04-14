import type { CoaType } from "@/features/finance/coa/types";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: unknown;
  error?: unknown;
}

export interface SystemAccountMapping {
  id: string;
  key: string;
  company_id?: string | null;
  coa_code: string;
  label: string;
  coa: {
    id: string;
    code: string;
    name: string;
    is_postable: boolean;
    is_active: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface UpsertSystemAccountMappingRequest {
  coa_code: string;
  label?: string;
}

export interface UpsertFinanceSettingRequest {
  setting_key: string;
  value: string;
  description?: string;
  category?: string;
}

export type FiscalYearStatus = "draft" | "active" | "locked";

export interface FiscalYear {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListFiscalYearParams {
  company_id: string;
  status?: FiscalYearStatus;
  page?: number;
  per_page?: number;
}

export interface CreateFiscalYearInput {
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export interface UpdateFiscalYearInput {
  name: string;
  start_date: string;
  end_date: string;
}

export type TaxType = "vat" | "income_tax" | "withholding_tax";

export interface TaxConfiguration {
  id: string;
  company_id: string;
  tax_code: string;
  tax_name: string;
  tax_type: TaxType;
  rate: number;
  is_inclusive: boolean;
  account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListTaxConfigurationParams {
  company_id: string;
  type?: TaxType;
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateTaxConfigurationInput {
  company_id: string;
  tax_code: string;
  tax_name: string;
  tax_type: TaxType;
  rate: number;
  is_inclusive: boolean;
  account_id: string;
  is_active?: boolean;
}

export interface UpdateTaxConfigurationInput {
  tax_code: string;
  tax_name: string;
  tax_type: TaxType;
  rate: number;
  is_inclusive: boolean;
  account_id: string;
}

export interface BatchUpsertFinanceSettingsRequest {
  settings: UpsertFinanceSettingRequest[];
}

export type InventoryValuationMethod = "average_cost" | "fifo" | "specific_identification";

export interface InventorySettings {
  id: string;
  company_id: string;
  valuation_method: InventoryValuationMethod;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateInventorySettingsInput {
  company_id: string;
  valuation_method: InventoryValuationMethod;
}

export interface InventoryAverageCost {
  company_id: string;
  product_id: string;
  average_cost: number;
  total_quantity: number;
  total_value: number;
  last_updated: string;
}

export interface OpeningBalanceLineInput {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  product_id?: string;
  product_qty?: number;
  product_avg_cost?: number;
}

export interface UpsertOpeningBalanceInput {
  company_id: string;
  fiscal_year_id: string;
  lines: OpeningBalanceLineInput[];
}

export interface OpeningBalanceValidation {
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  has_existing_txns: boolean;
  warnings: string[];
}

export interface OpeningBalanceSummary {
  company_id: string;
  fiscal_year_id: string;
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  is_posted: boolean;
  posted_journal_id?: string | null;
  total_lines: number;
  inventory_lines: number;
}

export interface OpeningBalanceSimulationLine {
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  status: string;
  action: string;
}

export interface OpeningBalanceSimulation {
  company_id: string;
  fiscal_year_id: string;
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  valuation_status: string;
  recommendation: string;
  lines: OpeningBalanceSimulationLine[];
}

export interface PostOpeningBalanceInput {
  company_id: string;
  fiscal_year_id: string;
}

export interface PostOpeningBalanceResult {
  journal_id: string;
  journal_status: string;
  journal_type: string;
  posted_at: string;
}

export interface SystemAccountMappingDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  allowedAccountTypes: CoaType[];
  required?: boolean;
}

const ASSET_TYPES: CoaType[] = ["ASSET", "CURRENT_ASSET", "FIXED_ASSET", "CASH_BANK"];
const INVENTORY_ASSET_TYPES: CoaType[] = ["ASSET", "CURRENT_ASSET"];
const LIABILITY_TYPES: CoaType[] = ["LIABILITY", "TRADE_PAYABLE"];
const REVENUE_TYPES: CoaType[] = ["REVENUE"];
const EXPENSE_TYPES: CoaType[] = ["EXPENSE", "COST_OF_GOODS_SOLD", "OPERATIONAL", "SALARY_WAGES"];
const EQUITY_TYPES: CoaType[] = ["EQUITY"];
const CASH_BANK_TYPES: CoaType[] = ["CASH_BANK"];

export const SYSTEM_ACCOUNT_MAPPING_DEFINITIONS: SystemAccountMappingDefinition[] = [
  {
    key: "sales.accounts_receivable",
    label: "Sales Accounts Receivable",
    description: "Accounts receivable account for sales invoice posting",
    category: "sales",
    allowedAccountTypes: ASSET_TYPES,
    required: true,
  },
  {
    key: "sales.revenue",
    label: "Sales Revenue",
    description: "Revenue account for sales recognition",
    category: "sales",
    allowedAccountTypes: REVENUE_TYPES,
    required: true,
  },
  {
    key: "sales.tax_output",
    label: "Sales Tax Output",
    description: "Output tax liability account for sales VAT",
    category: "sales",
    allowedAccountTypes: LIABILITY_TYPES,
    required: true,
  },
  {
    key: "sales.cogs",
    label: "Sales COGS",
    description: "Cost of goods sold account for inventory issue",
    category: "sales",
    allowedAccountTypes: EXPENSE_TYPES,
    required: true,
  },
  {
    key: "sales.sales_return",
    label: "Sales Return",
    description: "Return/contra account for sales return posting",
    category: "sales",
    allowedAccountTypes: [...REVENUE_TYPES, ...EXPENSE_TYPES],
  },
  {
    key: "purchase.inventory_asset",
    label: "Purchase Inventory Asset",
    description: "Inventory asset account used by goods receipt posting",
    category: "purchase",
    allowedAccountTypes: INVENTORY_ASSET_TYPES,
    required: true,
  },
  {
    key: "purchase.gr_ir_clearing",
    label: "Purchase GR/IR Clearing",
    description: "GR/IR clearing account for goods receipt and supplier invoices",
    category: "purchase",
    allowedAccountTypes: [...LIABILITY_TYPES, ...ASSET_TYPES],
    required: true,
  },
  {
    key: "purchase.tax_input",
    label: "Purchase Tax Input",
    description: "Input tax account for purchase VAT",
    category: "purchase",
    allowedAccountTypes: ASSET_TYPES,
    required: true,
  },
  {
    key: "purchase.accounts_payable",
    label: "Purchase Accounts Payable",
    description: "Accounts payable account for supplier invoices",
    category: "purchase",
    allowedAccountTypes: LIABILITY_TYPES,
    required: true,
  },
  {
    key: "inventory.adjustment_gain",
    label: "Inventory Adjustment Gain",
    description: "Gain account for positive stock adjustments",
    category: "inventory",
    allowedAccountTypes: [...REVENUE_TYPES, ...EQUITY_TYPES],
    required: true,
  },
  {
    key: "inventory.adjustment_loss",
    label: "Inventory Adjustment Loss",
    description: "Expense account for negative stock adjustments",
    category: "inventory",
    allowedAccountTypes: EXPENSE_TYPES,
    required: true,
  },
  {
    key: "asset.accumulated_depreciation",
    label: "Accumulated Depreciation",
    description: "Contra asset account for accumulated depreciation",
    category: "asset",
    allowedAccountTypes: ASSET_TYPES,
    required: true,
  },
  {
    key: "asset.depreciation_expense",
    label: "Depreciation Expense",
    description: "Expense account for periodic depreciation",
    category: "asset",
    allowedAccountTypes: EXPENSE_TYPES,
    required: true,
  },
  {
    key: "finance.opening_balance_equity",
    label: "Opening Balance Equity",
    description: "Equity account for opening balance postings",
    category: "finance",
    allowedAccountTypes: EQUITY_TYPES,
    required: true,
  },
  {
    key: "finance.bank_default",
    label: "Default Bank Account",
    description: "Default bank cash account",
    category: "cash_bank",
    allowedAccountTypes: CASH_BANK_TYPES,
    required: true,
  },
  {
    key: "finance.cash_default",
    label: "Default Cash Account",
    description: "Default cash-on-hand account",
    category: "cash_bank",
    allowedAccountTypes: CASH_BANK_TYPES,
    required: true,
  },
];

export function getMappingDefinitionByKey(key: string): SystemAccountMappingDefinition | undefined {
  return SYSTEM_ACCOUNT_MAPPING_DEFINITIONS.find((item) => item.key === key);
}
