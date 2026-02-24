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

export interface BSReportRow {
  account_code: string;
  account_name: string;
  balance: number;
  type: string;
  depth: number;
}

export interface BalanceSheetResponse {
  as_of_date: string;
  assets: BSReportRow[];
  liabilities: BSReportRow[];
  equity: BSReportRow[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

export interface PLReportRow {
  account_code: string;
  account_name: string;
  amount: number;
  type: string;
  depth: number;
}

export interface ProfitAndLossResponse {
  start_date: string;
  end_date: string;
  revenue: PLReportRow[];
  expenses: PLReportRow[];
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}
