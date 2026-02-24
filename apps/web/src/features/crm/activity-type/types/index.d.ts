// Activity Type Types
export interface ActivityType {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  badge_color: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateActivityTypeData {
  name: string;
  code: string;
  description?: string;
  icon?: string;
  badge_color?: string;
  order?: number;
  is_active?: boolean;
}

export interface UpdateActivityTypeData {
  name?: string;
  code?: string;
  description?: string;
  icon?: string;
  badge_color?: string;
  order?: number;
  is_active?: boolean;
}

export interface ActivityTypeListParams {
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
