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
  province_id?: string;
  province?: { id: string; name: string };
  city_id?: string;
  city?: { id: string; name: string };
  district_id?: string;
  district?: { id: string; name: string };
  village_id?: string;
  village_name?: string;
  village?: Village;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWarehouseData {
  name: string;
  description?: string;
  capacity?: number;
  address?: string;
  province_id?: string;
  city_id?: string;
  district_id?: string;
  village_id?: string;
  village_name?: string;
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
  // null = explicit clear (set DB column to NULL), string = set to UUID, undefined = always send null (caller must handle)
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  village_name?: string | null;
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
