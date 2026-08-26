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

export interface ProfitLossQueryParams {
  from_date?: string;
  to_date?: string;
  company_id?: string;
  fiscal_year_id?: string;
  months?: number;
}

export interface ProfitLossSummary {
  total_revenue: number;
  revenue_growth_percent: number;
  gross_profit: number;
  gross_profit_margin: number;
  operating_profit: number;
  operating_profit_margin: number;
  net_profit: number;
  net_profit_margin: number;
  previous_period_name: string;
}

export interface ProfitLossTrendPoint {
  period: string;
  label: string;
  revenue: number;
  gross_profit: number;
  net_profit: number;
}

export interface ProfitLossTrend {
  months: ProfitLossTrendPoint[];
}

export interface ProfitLossRevenueVsExpense {
  total_revenue: number;
  cogs: number;
  cogs_percent: number;
  operating_expenses: number;
  operating_expenses_percent: number;
  other_income: number;
  other_income_percent: number;
  other_expenses: number;
  other_expenses_percent: number;
}

export interface MultiPeriodRow {
  account_id?: string;
  code: string;
  name: string;
  account_type?: string;
  amounts: Record<string, number>;
  drilldown?: {
    general_ledger_url: string;
  };
}

export interface MultiPeriodSection {
  name: string;
  items: MultiPeriodRow[];
  totals: Record<string, number>;
}

export interface PeriodMeta {
  key: string;
  label: string;
  sub_label: string;
}

export interface ProfitLossStatementTable {
  periods: PeriodMeta[];
  revenue: MultiPeriodSection;
  cogs: MultiPeriodSection;
  gross_profit: Record<string, number>;
  gross_margin: Record<string, number>;
  operating_expense: MultiPeriodSection;
  operating_profit: Record<string, number>;
  operating_margin: Record<string, number>;
  other_income: MultiPeriodSection;
  other_expense: MultiPeriodSection;
  net_profit: Record<string, number>;
  net_margin: Record<string, number>;
}
