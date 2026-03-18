export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * A single journal line entry in the General Ledger account detail.
 * Derived exclusively from posted journal_entries + journal_lines.
 */
export interface GLTransactionRow {
  id: string;
  journal_id: string;
  entry_date: string;
  description: string;
  memo: string;
  reference_type: string | null;
  reference_id: string | null;
  /** Human-readable composite: reference_type + "/" + reference_id. Empty when no reference. */
  reference_code: string;
  debit: number;
  credit: number;
  /** Cumulative account balance after this line, starting from opening_balance. */
  running_balance: number;
}

/**
 * Per-account summary row in the General Ledger report.
 * Only accounts with posted activity or non-zero opening balance are included.
 */
export interface GeneralLedgerAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  transactions: GLTransactionRow[];
}

export interface GeneralLedgerResponse {
  start_date: string;
  end_date: string;
  accounts: GeneralLedgerAccount[];
}

export interface ReportRow {
  account_id?: string;
  code: string;
  name: string;
  account_type?: string;
  parent_id?: string | null;
  amount: number;
  subtotal_amount?: number;
  level?: number;
  children?: ReportRow[];
  drilldown?: {
    general_ledger_url: string;
  };
  is_total?: boolean;
}

export interface BalanceSheetResponse {
  start_date: string;
  end_date: string;
  include_zero?: boolean;
  assets: ReportRow[];
  asset_total: number;
  liabilities: ReportRow[];
  liability_total: number;
  equities: ReportRow[];
  equity_total: number;
  retained_earnings?: number;
  current_year_profit?: number;
  equity_total_final?: number;
  liability_equity_total: number;
  imbalance_amount?: number;
  is_balanced?: boolean;
  balance_tolerance?: number;
}

export type BSReportRow = ReportRow;
export type PLReportRow = ReportRow;

export interface ProfitAndLossComparison {
  start_date: string;
  end_date: string;
  revenue_total: number;
  cogs_total: number;
  expense_total: number;
  gross_profit: number;
  net_profit: number;
}

export interface ProfitAndLossResponse {
  start_date: string;
  end_date: string;
  revenues: ReportRow[];
  revenue_total: number;
  cogs: ReportRow[];
  cogs_total: number;
  expenses: ReportRow[];
  expense_total: number;
  gross_profit: number;
  net_profit: number;
  retained_earnings?: number;
  gross_margin?: number;
  net_margin?: number;
  expense_ratio?: number;
  previous_period?: ProfitAndLossComparison;
  year_to_date?: ProfitAndLossComparison;
}
