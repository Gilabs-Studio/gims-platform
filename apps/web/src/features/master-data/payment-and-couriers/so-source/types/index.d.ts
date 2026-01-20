// SO Source (Sales Order Source) Types
export interface SOSource {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSOSourceData { code: string; name: string; description?: string; is_active?: boolean; }
export interface UpdateSOSourceData { code?: string; name?: string; description?: string; is_active?: boolean; }
export interface SOSourceListParams { page?: number; per_page?: number; search?: string; sort_by?: string; sort_dir?: string; }
export interface PaginationMeta { page: number; per_page: number; total: number; total_pages: number; has_next: boolean; has_prev: boolean; }
export interface ApiResponse<T> { success: boolean; data: T; meta?: { pagination?: PaginationMeta; }; error?: string; }
