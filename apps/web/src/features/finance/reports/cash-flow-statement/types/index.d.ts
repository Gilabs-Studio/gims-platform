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
