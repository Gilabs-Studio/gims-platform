// Lead Source Types
export interface LeadSource {
  id: string;
  name: string;
  code: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadSourceData {
  name: string;
  description?: string;
}

export interface UpdateLeadSourceData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface LeadSourceListParams {
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
  meta?: { pagination?: PaginationMeta };
  error?: string;
}
