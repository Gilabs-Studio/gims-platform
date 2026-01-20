// ============================================
// Payment Terms Types
// ============================================

export interface PaymentTerms {
  id: string;
  code: string;
  name: string;
  description: string;
  days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentTermsData {
  name: string;
  description?: string;
  days?: number;
  is_active?: boolean;
}

export interface UpdatePaymentTermsData {
  code?: string;
  name?: string;
  description?: string;
  days?: number;
  is_active?: boolean;
}

export interface PaymentTermsListParams {
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
