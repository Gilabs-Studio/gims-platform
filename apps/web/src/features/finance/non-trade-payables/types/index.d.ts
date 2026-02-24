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

export type NonTradePayableStatus = "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";

export interface NonTradePayable {
  id: string;
  code: string;
  transaction_date: string;
  description: string;
  chart_of_account_id: string;
  amount: number;
  vendor_name: string;
  due_date?: string | null;
  reference_no: string;
  status: NonTradePayableStatus;
  created_at: string;
  updated_at: string;
}

export interface ListNonTradePayablesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: NonTradePayableStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface NonTradePayableInput {
  transaction_date: string;
  description?: string;
  chart_of_account_id: string;
  amount: number;
  vendor_name?: string;
  due_date?: string | null;
  reference_no?: string;
}

export interface PayNonTradePayableInput {
  payment_date: string;
  bank_account_id: string;
  reference_no?: string;
  notes?: string;
}
