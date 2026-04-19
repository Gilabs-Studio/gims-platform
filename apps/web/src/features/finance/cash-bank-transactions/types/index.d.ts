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

export type CashBankTransactionType = "payment_in" | "payment_out";
export type CashBankTransactionStatus = "draft" | "posted" | "reversed";

export interface CashBankTransaction {
  id: string;
  company_id: string;
  reference_number: string;
  bank_account_id: string;
  type: CashBankTransactionType;
  date: string;
  amount: number;
  reference: string;
  description: string;
  contra_account_id?: string | null;
  journal_entry_id?: string | null;
  journal_entry_number?: string | null;
  status: CashBankTransactionStatus;
  attachment_url?: string | null;
  reverse_of_id?: string | null;
  reversed_by_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashBankAccountFormOption {
  id: string;
  code: string;
  name: string;
  account_number: string;
}

export interface CashBankCoaFormOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface ValueLabelOption {
  value: string;
  label: string;
}

export interface CashBankTransactionFormData {
  bank_accounts: CashBankAccountFormOption[];
  transaction_types: ValueLabelOption[];
  contra_accounts: CashBankCoaFormOption[];
}

export interface ListCashBankTransactionsParams {
  page?: number;
  per_page?: number;
  company_id?: string;
  bank_account_id?: string;
  type?: CashBankTransactionType;
  status?: CashBankTransactionStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface CreateCashBankTransactionInput {
  company_id: string;
  bank_account_id: string;
  type: CashBankTransactionType;
  date: string;
  amount: number;
  reference?: string;
  description?: string;
  contra_account_id?: string | null;
  attachment_url?: string | null;
  auto_post?: boolean;
}

export interface ReverseCashBankTransactionInput {
  reason: string;
}
