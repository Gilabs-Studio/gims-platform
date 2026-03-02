export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number | null;
  prev_page?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: { field: string; order: string };
  };
  error?: string;
}

export type JournalStatus = "draft" | "posted";

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE"
  | "CASH_BANK"
  | "CURRENT_ASSET"
  | "FIXED_ASSET"
  | "TRADE_PAYABLE"
  | "COST_OF_GOODS_SOLD"
  | "SALARY_WAGES"
  | "OPERATIONAL";

export interface JournalLineDetail {
  id: string;
  journal_entry_id: string;
  entry_date: string;
  journal_description: string;
  journal_status: JournalStatus;
  reference_type?: string | null;
  reference_id?: string | null;
  chart_of_account_id: string;
  chart_of_account_code: string;
  chart_of_account_name: string;
  chart_of_account_type: AccountType;
  debit: number;
  credit: number;
  memo: string;
  running_balance: number;
  created_at: string;
}

export interface ListJournalLinesResponse {
  lines: JournalLineDetail[];
  total_debit: number;
  total_credit: number;
}

export interface ListJournalLinesParams {
  page?: number;
  per_page?: number;
  search?: string;
  chart_of_account_id?: string;
  account_type?: AccountType;
  reference_type?: string;
  journal_status?: JournalStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

/** Reference type options for filter dropdown */
export type ReferenceTypeOption =
  | "SO"
  | "PO"
  | "DO"
  | "GR"
  | "STOCK_OP"
  | "ADJUSTMENT"
  | "NTP"
  | "PAYMENT"
  | "ASSET_TXN"
  | "ASSET_DEP"
  | "CASH_BANK"
  | "UP_COUNTRY";
