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

export type CashBankType = "cash_in" | "cash_out" | "transfer";
export type CashBankStatus = "draft" | "posted";

export interface CashBankJournalLine {
  id: string;
  chart_of_account_id: string;
  chart_of_account?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
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
  bank_account?: {
    id: string;
    name: string;
    account_number: string;
    account_holder?: string;
    currency?: string;
  } | null;
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

export interface CoaFormOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface BankAccountFormOption {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  currency: string;
  coa_id?: string | null;
}

export interface EnumOption {
  value: string;
  label: string;
}

export interface CashBankFormData {
  chart_of_accounts: CoaFormOption[];
  bank_accounts: BankAccountFormOption[];
  types: EnumOption[];
}

export interface CashBankJournalInput {
  transaction_date: string;
  type: CashBankType;
  description: string;
  bank_account_id: string;
  lines: CashBankJournalLineInput[];
}

// Journal Lines types (previously imported from finance/journal-lines — inlined here after that feature was removed)
export interface ListJournalLinesParams {
  page?: number;
  per_page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface JournalLineRow {
  id: string;
  chart_of_account_id?: string | null;
  chart_of_account_name?: string | null;
  debit: number;
  credit: number;
  memo?: string | null;
}

export interface ListJournalLinesResponse {
  lines: JournalLineRow[];
}
