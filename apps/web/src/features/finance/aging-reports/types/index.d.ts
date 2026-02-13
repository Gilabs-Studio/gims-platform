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

export interface AgingBuckets {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
}

export interface AgingTotals {
  count: number;
  remaining: number;
  buckets: AgingBuckets;
}

export interface ARAgingRow {
  invoice_id: string;
  code: string;
  invoice_number?: string | null;
  invoice_date: string;
  due_date: string;
  days_past_due: number;
  amount: number;
  remaining_amount: number;
  buckets: AgingBuckets;
}

export interface APAgingRow {
  invoice_id: string;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  days_past_due: number;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  buckets: AgingBuckets;
}

export interface ARAgingReport {
  as_of_date: string;
  rows: ARAgingRow[];
  totals: AgingTotals;
}

export interface APAgingReport {
  as_of_date: string;
  rows: APAgingRow[];
  totals: AgingTotals;
}

export interface AgingQueryParams {
  as_of_date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}
