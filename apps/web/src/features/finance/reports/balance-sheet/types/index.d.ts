
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
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
