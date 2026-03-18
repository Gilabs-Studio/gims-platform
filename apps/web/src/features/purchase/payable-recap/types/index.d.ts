export interface PayableRecapRow {
  supplier_id: string;
  supplier_name: string;
  total_payable: number;
  down_payment: number;
  paid_amount: number;
  outstanding_amount: number;
  last_transaction: string;
  aging_days: number;
  aging_category: string;
}

export interface PayableSummary {
  total_suppliers: number;
  total_payable: number;
  total_paid: number;
  total_outstanding: number;
  current_count: number;
  overdue_1_30_count: number;
  overdue_31_60_count: number;
  overdue_61_90_count: number;
  bad_debt_count: number;
}

export interface PayableRecapListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: { field: string; order: string };
  };
}
