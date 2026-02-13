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

export type ClosingStatus = "draft" | "approved";

export interface FinancialClosing {
  id: string;
  period_end_date: string;
  status: ClosingStatus;
  notes: string;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListFinancialClosingParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_dir?: string;
}

export interface CreateFinancialClosingInput {
  period_end_date: string;
  notes?: string;
}
