// ============================================
// Outlet Module Types
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

// === Outlet ===
export interface Outlet {
  id: string;
  code: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  province_id?: string;
  province?: { id: string; name: string };
  city_id?: string;
  city?: { id: string; name: string };
  district_id?: string;
  district?: { id: string; name: string };
  village_id?: string;
  village?: Village;
  latitude?: number | null;
  longitude?: number | null;
  manager_id?: string;
  manager?: { id: string; name: string };
  company_id?: string;
  company?: { id: string; name: string };
  warehouse_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOutletData {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  province_id?: string;
  city_id?: string;
  district_id?: string;
  village_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  manager_id?: string;
  company_id?: string;
  is_active?: boolean;
  create_warehouse?: boolean;
}

export interface UpdateOutletData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  manager_id?: string | null;
  company_id?: string | null;
  is_active?: boolean;
}

// === Form Data ===
export interface OutletFormData {
  managers: { id: string; name: string }[];
  companies: { id: string; name: string }[];
}

// === API Response Types ===
export interface OutletListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  is_active?: boolean;
  company_id?: string;
  warehouse_id?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface OutletListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  error?: string;
}

export interface OutletSingleResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}
