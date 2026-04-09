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

export type CoaType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "CASH_BANK" | "CURRENT_ASSET" | "FIXED_ASSET" | "TRADE_PAYABLE" | "COST_OF_GOODS_SOLD" | "SALARY_WAGES" | "OPERATIONAL";

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: CoaType;
  parent_id?: string | null;
  is_active: boolean;
  is_postable?: boolean;
  is_protected?: boolean;
  opening_balance?: number;
  opening_date?: string | null;
  level?: number;
  created_at: string;
  updated_at: string;
}

export interface ChartOfAccountTreeNode {
  id: string;
  code: string;
  name: string;
  type: CoaType;
  parent_id?: string | null;
  is_active: boolean;
  is_postable?: boolean;
  is_protected?: boolean;
  opening_balance?: number;
  opening_date?: string | null;
  level?: number;
  children: ChartOfAccountTreeNode[];
}

export interface ListChartOfAccountsParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: CoaType;
  parent_id?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export interface CreateChartOfAccountInput {
  code: string;
  name: string;
  type: CoaType;
  parent_id?: string | null;
  is_active?: boolean;
  opening_balance?: number;
  opening_date?: string | null;
}

export type UpdateChartOfAccountInput = CreateChartOfAccountInput;
