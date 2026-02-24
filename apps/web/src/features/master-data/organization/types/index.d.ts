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
  supervisor_count?: number;
  supervisor_names?: string[];
  member_count?: number;
  created_at: string;
  updated_at: string;
}

/** Brief employee entry within an area's supervisor/member list */
export interface EmployeeInAreaResponse {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  division_id?: string;
  division_name?: string;
  job_position?: string;
  is_supervisor: boolean;
}

/** Full area detail with supervisor and member lists */
export interface AreaDetailResponse {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  supervisor_count: number;
  member_count: number;
  supervisors: EmployeeInAreaResponse[];
  members: EmployeeInAreaResponse[];
  created_at: string;
  updated_at: string;
}

/** Summary of an area assignment on an employee */
export interface EmployeeAreaSummary {
  area_id: string;
  area_name: string;
  description?: string;
  is_active: boolean;
  is_supervisor: boolean;
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
  province_id?: string | null;
  province?: { id: string; name: string };
  city_id?: string | null;
  city?: { id: string; name: string };
  district_id?: string | null;
  district?: { id: string; name: string };
  village_id?: string | null;
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
  director_id?: string | null;
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
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  director_id?: string | null;
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
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  director_id?: string | null;
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

export interface AssignAreaSupervisorsData {
  employee_ids: string[];
}

export interface AssignAreaMembersData {
  employee_ids: string[];
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
  company_type_id?: string;
  is_active?: boolean;
}

export interface ListAreasParams extends ListOrganizationParams {
  has_supervisor?: boolean;
  has_members?: boolean;
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
