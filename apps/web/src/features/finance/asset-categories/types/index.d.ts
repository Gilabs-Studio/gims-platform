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

export type DepreciationMethod = "SL" | "DB" | "NONE";

export type AssetCategoryType = "FIXED" | "CURRENT" | "INTANGIBLE" | "OTHER";

export interface AssetCategory {
  id: string;
  name: string;
  type: AssetCategoryType;
  is_depreciable: boolean;
  depreciation_method: DepreciationMethod;
  useful_life_months: number;
  depreciation_rate: number;
  asset_account_id: string;
  accumulated_depreciation_account_id: string;
  depreciation_expense_account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListAssetCategoryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface AssetCategoryInput {
  name: string;
  type: AssetCategoryType;
  is_depreciable: boolean;
  depreciation_method: DepreciationMethod;
  useful_life_months: number;
  depreciation_rate?: number;
  asset_account_id: string;
  accumulated_depreciation_account_id: string;
  depreciation_expense_account_id: string;
  is_active?: boolean;
}
