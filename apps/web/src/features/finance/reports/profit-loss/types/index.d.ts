
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

export interface ProfitAndLossResponse {
  start_date: string;
  end_date: string;
  revenues: ReportRow[];
  revenue_total: number;
  expenses: ReportRow[];
  expense_total: number;
  net_profit: number;
}
