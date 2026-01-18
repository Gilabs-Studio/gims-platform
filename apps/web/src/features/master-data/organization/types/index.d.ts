// Organization entity types for Sprint 2

// Simple entities with name and description
export interface Division {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobPosition {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Area Supervisor with assigned areas (M:N)
export interface AreaSupervisor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  areas?: Area[];
  created_at: string;
  updated_at: string;
}

// Company with approval workflow
export type CompanyStatus = "draft" | "pending" | "approved" | "rejected";

export interface Village {
  id: string;
  name: string;
  code: string;
  postal_code?: string;
  type: "village" | "kelurahan";
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  nib?: string;
  village_id?: string;
  village?: {
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
        }
      }
    }
  };
  latitude?: number | null;
  longitude?: number | null;
  director_id?: string;
  director?: { id: string; name: string };
  status: CompanyStatus;
  is_approved: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyData {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  nib?: string;
  village_id?: string;
  director_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  nib?: string;
  village_id?: string;
  director_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
}

export interface ApproveCompanyData {
  action: "approve" | "reject";
  reason?: string;
}

// -- Restored Types --

export interface CreateDivisionData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateDivisionData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateJobPositionData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateJobPositionData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateBusinessUnitData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateBusinessUnitData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateBusinessTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateBusinessTypeData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateAreaData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateAreaData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateAreaSupervisorData {
  name: string;
  email?: string;
  phone?: string;
  area_ids?: string[];
  is_active?: boolean;
}

export interface UpdateAreaSupervisorData {
  name?: string;
  email?: string;
  phone?: string;
  area_ids?: string[];
  is_active?: boolean;
}

export interface AssignAreasData {
  area_ids: string[];
}

export interface ListOrganizationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListCompaniesParams extends ListOrganizationParams {
  status?: CompanyStatus;
  village_id?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface OrganizationListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface OrganizationSingleResponse<T> {
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
