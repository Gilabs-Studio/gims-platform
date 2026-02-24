// Pipeline Stage Types
export interface PipelineStage {
  id: string;
  name: string;
  code: string;
  order: number;
  color: string;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePipelineStageData {
  name: string;
  code: string;
  order?: number;
  color?: string;
  probability?: number;
  is_won?: boolean;
  is_lost?: boolean;
  is_active?: boolean;
  description?: string;
}

export interface UpdatePipelineStageData {
  name?: string;
  code?: string;
  order?: number;
  color?: string;
  probability?: number;
  is_won?: boolean;
  is_lost?: boolean;
  is_active?: boolean;
  description?: string;
}

export interface PipelineStageListParams {
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
