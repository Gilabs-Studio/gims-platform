export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

export interface GLReportRow {
  account_id: string;
  account_code: string;
  account_name: string;
  beginning_balance: number;
  ending_balance: number;
  transactions: GLTransactionRow[];
}

export interface GLTransactionRow {
  date: string;
  reference_no: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedgerResponse {
  start_date: string;
  end_date: string;
  accounts: GLReportRow[];
}

export interface ReportRow {
  code: string;
  name: string;
  amount: number;
  is_total?: boolean;
}

export interface BalanceSheetResponse {
  date: string;
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
