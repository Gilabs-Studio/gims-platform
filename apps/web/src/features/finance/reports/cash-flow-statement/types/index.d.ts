export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CashFlowReportRow {
  account_id?: string;
  code: string;
  name: string;
  account_type?: string;
  amount: number;
  drilldown?: {
    general_ledger_url: string;
  };
}

export interface CashFlowSection {
  name: string;
  items: CashFlowReportRow[];
  amount: number;
}

export interface CashFlowStatementResponse {
  from_date: string;
  to_date: string;
  method?: string;
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  net_change: number;
  beginning_cash: number;
  ending_cash: number;
  is_reconciled: boolean;
  reconciliation_gap: number;
}

export interface CashFlowSummaryData {
  net_cash_flow: number;
  net_cash_flow_growth_percent: number;
  cash_inflow: number;
  cash_inflow_growth_percent: number;
  cash_outflow: number;
  cash_outflow_growth_percent: number;
  ending_cash_balance: number;
  ending_cash_balance_date: string;
  previous_period_name: string;
}

export interface CashFlowTrendPoint {
  period: string;
  label: string;
  cash_inflow: number;
  cash_outflow: number;
  net_cash_flow: number;
}

export interface CashFlowTrendData {
  months: CashFlowTrendPoint[];
}

export interface CashFlowYtdSummaryData {
  total_cash_inflow: number;
  total_cash_outflow: number;
  net_cash_flow: number;
  opening_cash_balance: number;
  opening_cash_date: string;
  ending_cash_balance: number;
  ending_cash_date: string;
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

export interface CashFlowStatementTableData {
  periods: PeriodMeta[];
  operating: MultiPeriodSection;
  investing: MultiPeriodSection;
  financing: MultiPeriodSection;
  net_increase_cash: Record<string, number>;
  opening_cash_balance: Record<string, number>;
  ending_cash_balance: Record<string, number>;
}
