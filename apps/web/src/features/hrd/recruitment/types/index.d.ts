// Recruitment Request types for Sprint 15

// ---- Shared/Lookup Types ----

export interface EmployeeSimple {
  id: string;
  employee_code: string;
  name: string;
}

export interface DivisionOption {
  id: string;
  name: string;
}

export interface JobPositionOption {
  id: string;
  name: string;
}

export interface EnumOption {
  value: string;
  label: string;
}

// ---- Recruitment Request Entity ----

export type RecruitmentStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "OPEN"
  | "CLOSED"
  | "CANCELLED";

export type RecruitmentPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type RecruitmentEmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERN";

export interface RecruitmentRequest {
  id: string;
  request_code: string;
  requested_by_id: string;
  requested_by?: EmployeeSimple | null;
  request_date: string;
  division_id: string;
  division_name?: string;
  position_id: string;
  position_name?: string;
  required_count: number;
  filled_count: number;
  open_positions: number;
  employment_type: RecruitmentEmploymentType;
  expected_start_date: string;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  job_description: string;
  qualifications: string;
  priority: RecruitmentPriority;
  status: RecruitmentStatus;
  notes?: string | null;
  approved_by_id?: string | null;
  approved_by?: EmployeeSimple | null;
  approved_at?: string | null;
  rejected_by_id?: string | null;
  rejected_at?: string | null;
  rejection_notes?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ---- List Params ----

export interface ListRecruitmentRequestsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: RecruitmentStatus;
  priority?: RecruitmentPriority;
  division_id?: string;
  position_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// ---- API Response Types ----

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface RecruitmentRequestListResponse {
  success: boolean;
  data: RecruitmentRequest[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface RecruitmentRequestSingleResponse {
  success: boolean;
  data: RecruitmentRequest;
  timestamp: string;
  request_id: string;
}

// ---- Form Data Response ----

export interface RecruitmentFormDataResponse {
  success: boolean;
  data: {
    employees: EmployeeSimple[];
    divisions: DivisionOption[];
    job_positions: JobPositionOption[];
    employment_types: EnumOption[];
    priorities: EnumOption[];
    statuses: EnumOption[];
  };
  timestamp: string;
  request_id: string;
}

// ---- Create/Update Data Types ----

export interface CreateRecruitmentRequestData {
  division_id: string;
  position_id: string;
  required_count: number;
  employment_type: string;
  expected_start_date: string;
  salary_range_min?: number;
  salary_range_max?: number;
  job_description: string;
  qualifications: string;
  priority?: string;
  notes?: string;
}

export interface UpdateRecruitmentRequestData {
  division_id?: string;
  position_id?: string;
  required_count?: number;
  employment_type?: string;
  expected_start_date?: string;
  salary_range_min?: number;
  salary_range_max?: number;
  job_description?: string;
  qualifications?: string;
  priority?: string;
  notes?: string;
}

export interface UpdateRecruitmentStatusData {
  status: RecruitmentStatus;
  notes?: string;
}

export interface UpdateFilledCountData {
  filled_count: number;
}
