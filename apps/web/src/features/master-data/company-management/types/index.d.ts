/**
 * Company Management Types
 *
 * Type definitions for company management feature based on API documentation.
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

export interface Director {
  id: number;
  name: string;
  username?: string;
  avatar_url?: string;
}

export interface Employee {
  id: number;
  name: string;
  username?: string;
  avatar_url?: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  photo_profile: string;
  avatar_url: string;
}

// Company interface based on actual API response
export interface Company {
  id: number;
  village: Village; // Always present with district_id and district_name
  director?: Director; // Only in detail/POST response
  director_id?: number; // Only when director field is present
  employee?: Employee; // Sometimes API returns 'employee' instead of 'director'
  city?: City; // For backward compatibility
  city_id?: number;
  name: string;
  address: string;
  npwp?: string;
  nib?: string;
  telp: string;
  email: string;
  latitude: number;
  longitude: number;
  created_by?: User;
  approved_by?: User;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyRequest {
  province_id: number;
  city_id: number;
  district_id: number;
  village_id: number;
  director_id: number;
  name: string;
  address: string;
  npwp?: string;
  nib?: string;
  telp: string;
  email: string;
  latitude: number;
  longitude: number;
}

export interface UpdateCompanyRequest {
  province_id: number;
  city_id: number;
  district_id: number;
  village_id: number;
  director_id: number;
  name: string;
  address: string;
  npwp?: string;
  nib?: string;
  telp: string;
  email: string;
  latitude: number;
  longitude: number;
}

export interface CompanyListResponse {
  success: boolean;
  data: Company[];
  meta: {
    pagination: {
      limit: number;
      page: number;
      total: number;
    };
    search: {
      search: string;
      searchBy: string;
    };
  };
  timestamp?: string;
  request_id?: string;
}

export interface CompanyResponse {
  success: boolean;
  data: Company;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeleteCompanyResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface CompanyStats {
  total: number;
  active: number;
  inactive: number;
}

export interface CompanyStatsResponse {
  success: boolean;
  data: CompanyStats;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface CompanyFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  dateFrom?: string;
  dateTo?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  city_id?: number;
}

// Add data response for form dropdowns
export interface CompanyAddDataResponse {
  success: boolean;
  data: {
    provinces: ProvinceWithCities[];
    directors: Director[];
  };
  timestamp?: string;
  request_id?: string;
}

export interface ApproveAllResponse {
  success: boolean;
  message: string;
  data?: {
    affected_count: number;
  };
  timestamp?: string;
  request_id?: string;
}

// Table column definition
export interface CompanyTableColumn {
  id: keyof Company | "actions";
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}
