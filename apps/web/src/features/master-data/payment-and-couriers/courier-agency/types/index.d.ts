// ============================================
// Courier Agency Types
// ============================================

export interface CourierAgency {
  id: string;
  code: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  tracking_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCourierAgencyData {
  name: string;
  description?: string;
  phone?: string;
  address?: string;
  tracking_url?: string;
  is_active?: boolean;
}

export interface UpdateCourierAgencyData {
  code?: string;
  name?: string;
  description?: string;
  phone?: string;
  address?: string;
  tracking_url?: string;
  is_active?: boolean;
}

export interface CourierAgencyListParams {
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
  meta?: {
    pagination?: PaginationMeta;
  };
  error?: string;
}
