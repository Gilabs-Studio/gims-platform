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
}

export type UpdateChartOfAccountInput = CreateChartOfAccountInput;
