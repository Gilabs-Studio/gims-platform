// Geographic entity types for Sprint 1

export interface Country {
  id: string;
  name: string;
  code: string;
  phone_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id: string;
  country_id: string;
  country?: Country;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  province_id: string;
  province?: Province;
  name: string;
  code: string;
  type: "city" | "regency";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: string;
  city_id: string;
  city?: City;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Village {
  id: string;
  district_id: string;
  district?: District;
  name: string;
  code: string;
  postal_code?: string;
  type: "village" | "kelurahan";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListGeographicParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListProvincesParams extends ListGeographicParams {
  country_id?: string;
}

export interface ListCitiesParams extends ListGeographicParams {
  province_id?: string;
  type?: "city" | "regency";
}

export interface ListDistrictsParams extends ListGeographicParams {
  city_id?: string;
}

export interface ListVillagesParams extends ListGeographicParams {
  district_id?: string;
  type?: "village" | "kelurahan";
}

// Pagination meta
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// API Response types
export interface GeographicListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface GeographicSingleResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    created_by?: string;
    updated_by?: string;
    deleted_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Form data types for create/update
export interface CreateCountryData {
  name: string;
  code: string;
  phone_code?: string;
  is_active?: boolean;
}

export interface UpdateCountryData {
  name?: string;
  code?: string;
  phone_code?: string;
  is_active?: boolean;
}

export interface CreateProvinceData {
  country_id: string;
  name: string;
  code: string;
  is_active?: boolean;
}

export interface UpdateProvinceData {
  country_id?: string;
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface CreateCityData {
  province_id: string;
  name: string;
  code: string;
  type?: "city" | "regency";
  is_active?: boolean;
}

export interface UpdateCityData {
  province_id?: string;
  name?: string;
  code?: string;
  type?: "city" | "regency";
  is_active?: boolean;
}

export interface CreateDistrictData {
  city_id: string;
  name: string;
  code: string;
  is_active?: boolean;
}

export interface UpdateDistrictData {
  city_id?: string;
  name?: string;
  code?: string;
  is_active?: boolean;
}

export interface CreateVillageData {
  district_id: string;
  name: string;
  code: string;
  postal_code?: string;
  type?: "village" | "kelurahan";
  is_active?: boolean;
}

export interface UpdateVillageData {
  district_id?: string;
  name?: string;
  code?: string;
  postal_code?: string;
  type?: "village" | "kelurahan";
  is_active?: boolean;
}
