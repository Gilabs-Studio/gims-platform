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
  village?: Village;
  director_id?: string;
  status: CompanyStatus;
  is_approved: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// List request params - base type
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

// Form data types - Division
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

// Form data types - JobPosition
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

// Form data types - BusinessUnit
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

// Form data types - BusinessType
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

// Form data types - Area
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

// Form data types - AreaSupervisor
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

// Form data types - Company
export interface CreateCompanyData {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  npwp?: string;
  nib?: string;
  village_id?: string;
  director_id?: string;
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
  is_active?: boolean;
}

export interface ApproveCompanyData {
  action: "approve" | "reject";
  reason?: string;
}
