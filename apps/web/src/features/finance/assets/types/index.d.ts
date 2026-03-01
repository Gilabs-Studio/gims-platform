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

export type AssetStatus = "active" | "disposed";

export interface AssetCategoryLite {
  id: string;
  name: string;
}

export interface AssetLocationLite {
  id: string;
  name: string;
}

export interface AssetTransaction {
  id: string;
  asset_id: string;
  type: string;
  transaction_date: string;
  description: string;
  amount: number;
  status: "DRAFT" | "APPROVED" | "CANCELLED";
  reference_type?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface AssetDepreciation {
  id: string;
  asset_id: string;
  period: string;
  depreciation_date: string;
  method: string;
  amount: number;
  accumulated: number;
  book_value: number;
  journal_entry_id?: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  category_id: string;
  category?: AssetCategoryLite | null;
  location_id: string;
  location?: AssetLocationLite | null;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value: number;
  accumulated_depreciation: number;
  book_value: number;
  status: AssetStatus;
  disposed_at?: string | null;
  created_at: string;
  updated_at: string;
  depreciations?: AssetDepreciation[];
  transactions?: AssetTransaction[];
}

export interface ListAssetsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: AssetStatus;
  category_id?: string;
  location_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface AssetInput {
  code: string;
  name: string;
  category_id: string;
  location_id: string;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value?: number;
}

export interface DepreciateAssetInput {
  as_of_date: string;
}

export interface TransferAssetInput {
  location_id: string;
  transfer_date: string;
  description?: string;
}

export interface DisposeAssetInput {
  disposal_date: string;
  description?: string;
}

export interface RevalueAssetInput {
  new_cost: number;
  transaction_date: string;
  description?: string;
}

export interface AdjustAssetInput {
  amount: number;
  transaction_date: string;
  description?: string;
}
