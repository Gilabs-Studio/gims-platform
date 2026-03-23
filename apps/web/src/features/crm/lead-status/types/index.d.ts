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
  created_at: string;
  updated_at: string;
}

export interface CreateLeadStatusData {
  name: string;
  description?: string;
  score?: number;
  color?: string;
}

export interface UpdateLeadStatusData {
  name?: string;
  description?: string;
  score?: number;
  color?: string;
  is_active?: boolean;
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
