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

export interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  account_holder: string;
  currency: string;
  chart_of_account_id?: string | null;
  village_id?: string | null;
  bank_address?: string;
  bank_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  transaction_history?: BankAccountTransaction[];
}

export interface BankAccountTransaction {
  id: string;
  transaction_type: string;
  transaction_date: string;
  reference_id: string;
  sales_order_id?: string | null;
  amount: number;
  status: string;
  description: string;
}

export interface ListBankAccountsParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export interface BankAccountInput {
  name: string;
  account_number: string;
  account_holder: string;
  currency: string;
  chart_of_account_id?: string | null;
  village_id?: string | null;
  bank_address?: string;
  bank_phone?: string;
  is_active?: boolean;
}
