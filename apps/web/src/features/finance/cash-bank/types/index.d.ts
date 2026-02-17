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

export type CashBankType = "cash_in" | "cash_out";
export type CashBankStatus = "draft" | "posted";

export interface CashBankJournalLine {
  id: string;
  chart_of_account_id: string;
  reference_type?: string | null;
  reference_id?: string | null;
  amount: number;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface CashBankJournal {
  id: string;
  transaction_date: string;
  type: CashBankType;
  description: string;
  bank_account_id: string;
  total_amount: number;
  status: CashBankStatus;
  journal_entry_id?: string | null;
  posted_at?: string | null;
  posted_by?: string | null;
  created_at: string;
  updated_at: string;
  lines?: CashBankJournalLine[];
}

export interface ListCashBankParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: CashBankType;
  status?: CashBankStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface CashBankJournalLineInput {
  chart_of_account_id: string;
  amount: number;
  memo: string;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface CashBankJournalInput {
  transaction_date: string;
  type: CashBankType;
  description: string;
  bank_account_id: string;
  lines: CashBankJournalLineInput[];
}
