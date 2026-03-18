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

// ---- Recruitment Applicant Types ----

export interface ApplicantStage {
  id: string;
  name: string;
  color: string;
  order: number;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
}

export type ApplicantSource =
  | "linkedin"
  | "jobstreet"
  | "glints"
  | "referral"
  | "direct"
  | "other";

export interface RecruitmentApplicant {
  id: string;
  recruitment_request_id: string;
  stage_id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  source: ApplicantSource;
  applied_at: string;
  last_activity_at: string;
  rating?: number;
  notes?: string;
  stage?: ApplicantStage;
  created_at: string;
  updated_at: string;
}

export interface ApplicantActivity {
  id: string;
  applicant_id: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export type ActivityType =
  | "stage_change"
  | "note_added"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_sent"
  | "offer_accepted"
  | "offer_declined"
  | "hired"
  | "rejected"
  | "created"
  | "updated"
  | "resume_uploaded"
  | "rating_changed";

// ---- Applicant List/Filter Params ----

export interface ListApplicantsParams {
  page?: number;
  per_page?: number;
  search?: string;
  recruitment_request_id?: string;
  stage_id?: string;
  source?: ApplicantSource;
}

export interface ListApplicantsByStageParams {
  page?: number;
  per_page?: number;
  search?: string;
  recruitment_request_id?: string;
  stage_id?: string;
}

// ---- Applicant API Response Types ----

export interface RecruitmentApplicantListResponse {
  success: boolean;
  data: RecruitmentApplicant[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface RecruitmentApplicantSingleResponse {
  success: boolean;
  data: RecruitmentApplicant;
  timestamp: string;
  request_id: string;
}

export interface ApplicantsByStageResponse {
  [stageId: string]: {
    stage_id: string;
    stage_name: string;
    stage_color: string;
    order: number;
    applicants: RecruitmentApplicant[];
    total: number;
  };
}

export interface ApplicantStageListResponse {
  success: boolean;
  data: ApplicantStage[];
  timestamp: string;
  request_id: string;
}

export interface ApplicantActivityListResponse {
  success: boolean;
  data: ApplicantActivity[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface ApplicantActivitySingleResponse {
  success: boolean;
  data: ApplicantActivity;
  timestamp: string;
  request_id: string;
}

// ---- Applicant Create/Update Data Types ----

export interface CreateApplicantData {
  recruitment_request_id: string;
  stage_id: string;
  full_name: string;
  email: string;
  phone?: string;
  source: ApplicantSource;
  notes?: string;
  resume_url?: string;
}

export interface UpdateApplicantData {
  full_name?: string;
  email?: string;
  phone?: string;
  source?: ApplicantSource;
  notes?: string;
  resume_url?: string;
  rating?: number;
}

export interface MoveStageData {
  to_stage_id: string;
  reason?: string;
  notes?: string;
}

export interface CreateActivityData {
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}
