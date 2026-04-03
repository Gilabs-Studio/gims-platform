
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

export interface ProfitAndLossResponse {
  start_date: string;
  end_date: string;
  revenues: ReportRow[];
  revenue_total: number;
  cogs?: ReportRow[];
  cogs_total?: number;
  expenses: ReportRow[];
  expense_total: number;
  net_profit: number;
  retained_earnings?: number;
  gross_margin?: number;
  net_margin?: number;
  expense_ratio?: number;
  previous_period?: {
    net_profit?: number;
  };
}
