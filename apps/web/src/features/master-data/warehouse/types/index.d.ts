// ============================================
// Warehouse Module Types
// ============================================

// === Village (Nested from Geographic) ===
export interface Village {
  id: string;
  name: string;
  district?: {
    id: string;
    name: string;
    city?: {
      id: string;
      name: string;
      province?: {
        id: string;
        name: string;
      };
    };
  };
}

// === Warehouse ===
export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description?: string;
  capacity?: number;
  address?: string;
  village_id?: string;
  village?: Village;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseData {
  code: string;
  name: string;
  description?: string;
  capacity?: number;
  address?: string;
  village_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

export interface UpdateWarehouseData {
  code?: string;
  name?: string;
  description?: string;
  capacity?: number;
  address?: string;
  village_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

// === API Response Types ===
export interface WarehouseListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  is_active?: boolean;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface WarehouseListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  error?: string;
}

export interface WarehouseSingleResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}
