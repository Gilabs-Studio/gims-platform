// Contact Role Types
export interface ContactRole {
  id: string;
  name: string;
  code: string;
  description: string;
  badge_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContactRoleData {
  name: string;
  description?: string;
  badge_color?: string;
}

export interface UpdateContactRoleData {
  name?: string;
  description?: string;
  badge_color?: string;
  is_active?: boolean;
}

export interface ContactRoleListParams {
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
