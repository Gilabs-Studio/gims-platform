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

export type JournalStatus = "draft" | "posted" | "reversed";

export interface JournalLine {
  id: string;
  chart_of_account_id: string;
  chart_of_account?: { id: string; code: string; name: string } | null;
  debit: number;
  credit: number;
  memo?: string | null;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  status: JournalStatus;
  posted_at?: string | null;
  posted_by?: string | null;
  lines: JournalLine[];
  debit_total: number;
  credit_total: number;
  created_at: string;
  updated_at: string;
}

export interface ListJournalEntriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: JournalStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface JournalLineInput {
  chart_of_account_id: string;
  debit?: number;
  credit?: number;
  memo?: string | null;
}

export interface CreateJournalEntryInput {
  entry_date: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  lines: JournalLineInput[];
}

export type UpdateJournalEntryInput = CreateJournalEntryInput;

export interface TrialBalanceRow {
  chart_of_account_id: string;
  code: string;
  name: string;
  type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalanceResponse {
  start_date?: string | null;
  end_date?: string | null;
  rows: TrialBalanceRow[];
}
