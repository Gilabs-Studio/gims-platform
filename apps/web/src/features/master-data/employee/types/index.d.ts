// Employee entity types for Sprint 3

export type EmployeeStatus = "draft" | "pending" | "approved" | "rejected";
export type ContractStatus = "permanent" | "contract" | "probation" | "intern";
export type Gender = "male" | "female";
export type PTKPStatus =
  | "TK/0"
  | "TK/1"
  | "TK/2"
  | "TK/3"
  | "K/0"
  | "K/1"
  | "K/2"
  | "K/3"
  | "K/I/0"
  | "K/I/1"
  | "K/I/2"
  | "K/I/3";

export interface Division {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface JobPosition {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface EmployeeArea {
  id: string;
  employee_id: string;
  area_id: string;
  is_supervisor: boolean;
  area?: Area;
  created_at: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
  user_id?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  division_id?: string;
  division?: Division;
  job_position_id?: string;
  job_position?: JobPosition;
  company_id?: string;
  company?: {
    id: string;
    name: string;
  };
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: Gender;
  religion?: string;
  address?: string;
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
        };
      };
    };
  };
  nik?: string;
  npwp?: string;
  bpjs?: string;
  contract_status?: ContractStatus;
  contract_start_date?: string;
  contract_end_date?: string;
  total_leave_quota?: number;
  ptkp_status?: PTKPStatus;
  is_disability?: boolean;
  replacement_for_id?: string;
  replacement_for?: {
    id: string;
    employee_code: string;
    name: string;
  };
  areas?: EmployeeArea[];
  is_area_supervisor: boolean;
  status: EmployeeStatus;
  is_approved: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
  user_id?: string;
  division_id?: string;
  job_position_id?: string;
  company_id?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: Gender;
  religion?: string;
  address?: string;
  village_id?: string;
  nik?: string;
  npwp?: string;
  bpjs?: string;
  contract_status?: ContractStatus;
  contract_start_date?: string;
  contract_end_date?: string;
  total_leave_quota?: number;
  ptkp_status?: PTKPStatus;
  is_disability?: boolean;
  replacement_for_id?: string;
  area_ids?: string[];
  supervised_area_ids?: string[];
  is_active?: boolean;
}

export interface UpdateEmployeeData {
  employee_code?: string;
  name?: string;
  email?: string;
  phone?: string;
  user_id?: string;
  division_id?: string;
  job_position_id?: string;
  company_id?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: Gender;
  religion?: string;
  address?: string;
  village_id?: string;
  nik?: string;
  npwp?: string;
  bpjs?: string;
  contract_status?: ContractStatus;
  contract_start_date?: string;
  contract_end_date?: string;
  total_leave_quota?: number;
  ptkp_status?: PTKPStatus;
  is_disability?: boolean;
  replacement_for_id?: string;
  area_ids?: string[];
  supervised_area_ids?: string[];
  is_active?: boolean;
}

export interface ApproveEmployeeData {
  action: "approve" | "reject";
  reason?: string;
}

export interface AssignEmployeeAreasData {
  area_ids: string[];
}

export interface AreaAssignment {
  area_id: string;
  is_supervisor: boolean;
}

export interface BulkUpdateEmployeeAreasData {
  assignments: AreaAssignment[];
}

export interface AvailableUser {
  id: string;
  email: string;
  name: string;
}

export interface AvailableUsersResponse {
  success: boolean;
  data: AvailableUser[];
  timestamp: string;
  request_id: string;
}

export interface FormOption {
  id: string;
  name: string;
}

export interface EmployeeFormData {
  divisions: FormOption[];
  job_positions: FormOption[];
  companies: FormOption[];
  areas: FormOption[];
}

export interface EmployeeFormDataResponse {
  success: boolean;
  data: EmployeeFormData;
  timestamp: string;
  request_id: string;
}

// Represents an individual area assignment with role (used by bulk update)
export interface AreaAssignment {
  area_id: string;
  is_supervisor: boolean;
}

export interface BulkUpdateEmployeeAreasData {
  assignments: AreaAssignment[];
}

// Lightweight user returned by GET /users/available
export interface AvailableUser {
  id: string;
  email: string;
  name: string;
}

export interface AvailableUsersResponse {
  success: boolean;
  data: AvailableUser[];
}

// Generic form option returned by GET /employees/form-data
export interface FormOption {
  id: string;
  name: string;
}

export interface EmployeeFormDataResponse {
  success: boolean;
  data: {
    divisions: FormOption[];
    job_positions: FormOption[];
    companies: FormOption[];
    areas: FormOption[];
  };
}

export interface ListEmployeesParams {
  page?: number;
  per_page?: number;
  search?: string;
  division_id?: string;
  job_position_id?: string;
  area_id?: string;
  company_id?: string;
  status?: EmployeeStatus;
  is_active?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface EmployeeListResponse {
  success: boolean;
  data: Employee[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface EmployeeSingleResponse {
  success: boolean;
  data: Employee;
  meta?: {
    created_by?: string;
    updated_by?: string;
    deleted_by?: string;
  };
  timestamp: string;
  request_id: string;
}
