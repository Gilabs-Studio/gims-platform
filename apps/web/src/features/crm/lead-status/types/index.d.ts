// Lead Status Types
export interface LeadStatus {
  id: string;
  name: string;
  code: string;
  description: string;
  score: number;
  color: string;
  order: number;
  is_active: boolean;
  is_default: boolean;
  is_converted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadStatusData {
  name: string;
  code: string;
  description?: string;
  score?: number;
  color?: string;
  order?: number;
  is_active?: boolean;
  is_default?: boolean;
  is_converted?: boolean;
}

export interface UpdateLeadStatusData {
  name?: string;
  code?: string;
  description?: string;
  score?: number;
  color?: string;
  order?: number;
  is_active?: boolean;
  is_default?: boolean;
  is_converted?: boolean;
}

export interface LeadStatusListParams {
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
