
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ReportRow {
  code: string;
  name: string;
  amount: number;
  account_id?: string;
  level?: number;
  subtotal_amount?: number;
  children?: ReportRow[];
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
  equity_total_final?: number;
  retained_earnings?: number;
  current_year_profit?: number;
  is_balanced?: boolean;
  imbalance_amount?: number;
  balance_tolerance?: number;
  liability_equity_total: number;
}
