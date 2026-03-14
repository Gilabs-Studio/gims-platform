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

export type BudgetStatus = "draft" | "approved";

export interface BudgetItem {
  id: string;
  chart_of_account_id: string;
  coa_code?: string;
  coa_name?: string;
  amount: number;
  used_amount?: number;
  remaining_amount?: number;
  memo: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  name: string;
  description: string;
  department?: string;
  fiscal_year?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  used_amount?: number;
  remaining_amount?: number;
  status: BudgetStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  items?: BudgetItem[];
}

export interface ListBudgetsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: BudgetStatus;
  start_date?: string;
  end_date?: string;
  fiscal_year?: string;
  department?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface BudgetItemInput {
  chart_of_account_id: string;
  amount: number;
  memo: string;
}

export interface BudgetInput {
  name: string;
  description: string;
  department?: string;
  fiscal_year?: string;
  start_date: string;
  end_date: string;
  items: BudgetItemInput[];
}
