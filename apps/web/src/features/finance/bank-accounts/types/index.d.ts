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
  currency_id?: string | null;
  currency_detail?: {
    id: string;
    code: string;
    name: string;
    symbol?: string;
    decimal_places: number;
  } | null;
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
  reference_type: string;
  reference_id: string;
  reference_number?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  related_entity_label?: string | null;
  amount: number;
  status: string;
  description: string;
}

export interface UnifiedBankAccount {
  id: string;
  source_type: "company" | "customer" | "supplier";
  name: string;
  bank_name?: string | null;
  bank_code?: string | null;
  account_number: string;
  account_holder: string;
  currency_id?: string | null;
  currency: string;
  currency_detail?: {
    id: string;
    code: string;
    name: string;
    symbol?: string;
    decimal_places: number;
  } | null;
  owner_type: "company" | "customer" | "supplier";
  owner_id?: string | null;
  owner_name: string;
  owner_code?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  currency_id: string;
  chart_of_account_id?: string | null;
  village_id?: string | null;
  bank_address?: string;
  bank_phone?: string;
  is_active?: boolean;
}
