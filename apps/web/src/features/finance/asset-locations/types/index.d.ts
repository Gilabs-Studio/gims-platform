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

export interface AssetLocation {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ListAssetLocationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface AssetLocationInput {
  name: string;
  description?: string;
}
