/**
 * Supplier Management Types
 *
 * Type definitions for supplier management feature based on API documentation.
 */

export interface City {
  id: number;
  name: string;
  province_id: number;
  province_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  cities: City[] | null;
}

// Village in API Response (GET data)
export interface Village {
  id: number;
  name: string;
  district_id: number;
  district_name: string;
}

// Nested structures for form dropdowns only (GET add data)
export interface VillageOption {
  id: number;
  name: string;
}

export interface District {
  id: number;
  name: string;
  villages: VillageOption[] | null;
}

export interface CityWithDistricts {
  id: number;
  name: string;
  districts: District[] | null;
}

export interface ProvinceWithCities {
  id: number;
  name: string;
  cities: CityWithDistricts[] | null;
}

export interface User {
  id: number;
  name: string;
  username: string;
  photo_profile: string;
  avatar_url: string;
}

// Supplier interface based on actual API response
export interface Supplier {
  id: number;
  village: Village; // Always present with district_id and district_name
  city?: City; // For backward compatibility
  city_id?: number;
  name: string;
  address: string;
  contact_person: string;
  phone: string;
  email?: string;
  logo_url?: string;
  latitude: number;
  longitude: number;
  created_by?: User;
  approved_by?: User;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface SupplierListResponse {
  data: Supplier[];
  meta: {
    filter: {
      end_date: string;
      start_date: string;
    };
    pagination: {
      limit: number;
      page: number;
      total: number;
    };
    search: {
      search: string;
      searchBy: string;
    };
    searchable_columns: {
      numeric_columns: string[];
      string_columns: string[];
    };
    sort: {
      sort_by: string;
      sort_order: string;
    };
    sortable_columns: {
      available_fields: string[];
    };
  };
}

export interface SupplierResponse {
  data: Supplier;
  message?: string;
}

export interface SupplierStatsResponse {
  data: {
    total: number;
  };
  message?: string;
}

export interface SupplierAddDataResponse {
  data: {
    provinces: ProvinceWithCities[];
  };
}

export interface DeleteSupplierResponse {
  message: string;
}

