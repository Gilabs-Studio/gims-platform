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

export type PaymentStatus = "draft" | "posted";

export interface PaymentAllocation {
  id: string;
  chart_of_account_id: string;
  amount: number;
  memo: string;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface Payment {
  id: string;
  payment_date: string;
  description: string;
  bank_account_id: string;
  total_amount: number;
  status: PaymentStatus;
  journal_entry_id?: string | null;
  allocations?: PaymentAllocation[];
  created_at: string;
  updated_at: string;
}

export interface ListPaymentsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: PaymentStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface PaymentAllocationInput {
  chart_of_account_id: string;
  amount: number;
  memo: string;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface PaymentInput {
  payment_date: string;
  description: string;
  bank_account_id: string;
  total_amount: number;
  allocations: PaymentAllocationInput[];
}
