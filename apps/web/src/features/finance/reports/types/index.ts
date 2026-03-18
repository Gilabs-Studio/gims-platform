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
  code: string;
  name: string;
  amount: number;
  is_total?: boolean;
}

export interface BalanceSheetResponse {
  start_date: string;
  end_date: string;
  assets: ReportRow[];
  asset_total: number;
  liabilities: ReportRow[];
  liability_total: number;
  equities: ReportRow[];
  equity_total: number;
  liability_equity_total: number;
}

export type BSReportRow = ReportRow;
export type PLReportRow = ReportRow;

export interface ProfitAndLossResponse {
  start_date: string;
  end_date: string;
  revenues: ReportRow[];
  revenue_total: number;
  expenses: ReportRow[];
  expense_total: number;
  net_profit: number;
}
