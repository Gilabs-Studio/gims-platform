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

export type AssetBudgetStatus = "draft" | "active" | "closed" | "cancelled";

export interface AssetBudgetCategory {
  id: string;
  category_id?: string | null;
  category_name: string;
  allocated_amount: number;
  used_amount: number;
  committed_amount: number;
  available_amount: number;
  notes: string;
}

export interface AssetBudgetSummary {
  total_allocated: number;
  total_used: number;
  total_committed: number;
  total_available: number;
  utilization_rate: number;
}

export interface AssetBudget {
  id: string;
  budget_code: string;
  budget_name: string;
  description: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  total_budget: number;
  status: AssetBudgetStatus;
  categories: AssetBudgetCategory[];
  summary: AssetBudgetSummary;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetCategoryInput {
  category_id?: string;
  category_name: string;
  allocated_amount: number;
  notes?: string;
}

export interface CreateAssetBudgetInput {
  budget_name: string;
  description?: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  categories: CreateBudgetCategoryInput[];
}

export interface UpdateBudgetCategoryInput {
  id?: string;
  category_id?: string;
  category_name: string;
  allocated_amount: number;
  notes?: string;
}

export interface UpdateAssetBudgetInput {
  budget_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  categories: UpdateBudgetCategoryInput[];
}

export interface ChangeAssetBudgetStatusInput {
  status: AssetBudgetStatus;
}

export interface ListAssetBudgetsParams {
  page?: number;
  per_page?: number;
  fiscal_year?: number;
  status?: AssetBudgetStatus;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface AssetCategoryMini {
  id: string;
  name: string;
}

export interface AssetBudgetFormData {
  categories: AssetCategoryMini[];
}
