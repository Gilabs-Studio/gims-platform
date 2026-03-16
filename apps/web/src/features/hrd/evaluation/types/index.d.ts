// Evaluation types for Sprint 15

// ---- Shared/Lookup Types ----

export interface EmployeeSimple {
  id: string;
  employee_code: string;
  name: string;
}

export interface EvaluationGroupSimple {
  id: string;
  name: string;
}

export interface EvaluationTypeOption {
  value: string;
  label: string;
}

export interface EvaluationStatusOption {
  value: string;
  label: string;
}

// ---- Evaluation Group ----

export interface EvaluationGroup {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  total_weight: number;
  criteria?: EvaluationCriteria[];
  created_at: string;
  updated_at: string;
}

export type ListEvaluationGroupsParams = {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
};

export interface CreateEvaluationGroupData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateEvaluationGroupData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ---- Evaluation Criteria ----

export interface EvaluationCriteria {
  id: string;
  evaluation_group_id: string;
  name: string;
  description?: string | null;
  weight: number;
  max_score: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ListEvaluationCriteriaParams = {
  page?: number;
  per_page?: number;
  search?: string;
};

export interface CreateEvaluationCriteriaData {
  evaluation_group_id: string;
  name: string;
  description?: string;
  weight: number;
  max_score?: number;
  sort_order?: number;
}

export interface UpdateEvaluationCriteriaData {
  name?: string;
  description?: string;
  weight?: number;
  max_score?: number;
  sort_order?: number;
}

// ---- Employee Evaluation ----

export type EmployeeEvaluationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEWED"
  | "FINALIZED";

export type EvaluationType = "SELF" | "MANAGER";

export interface EvaluationCriteriaScore {
  id: string;
  evaluation_criteria_id: string;
  criteria_name?: string;
  score: number;
  weight: number;
  weighted_score: number;
  notes?: string | null;
}

export interface EmployeeEvaluation {
  id: string;
  employee_id: string;
  employee?: EmployeeSimple | null;
  evaluation_group_id: string;
  evaluation_group?: EvaluationGroupSimple | null;
  evaluator_id: string;
  evaluator?: EmployeeSimple | null;
  evaluation_type: EvaluationType;
  period_start: string;
  period_end: string;
  overall_score: number;
  status: EmployeeEvaluationStatus;
  notes?: string | null;
  criteria_scores?: EvaluationCriteriaScore[];
  created_at: string;
  updated_at: string;
}

export interface CreateEvaluationCriteriaScoreData {
  evaluation_criteria_id: string;
  score: number;
  notes?: string;
}

export interface CreateEmployeeEvaluationData {
  employee_id: string;
  evaluation_group_id: string;
  evaluator_id: string;
  evaluation_type: string;
  period_start: string;
  period_end: string;
  notes?: string;
  criteria_scores?: CreateEvaluationCriteriaScoreData[];
}

export interface UpdateEmployeeEvaluationData {
  evaluator_id?: string;
  evaluation_type?: string;
  period_start?: string;
  period_end?: string;
  notes?: string;
  criteria_scores?: CreateEvaluationCriteriaScoreData[];
}

export interface UpdateEvaluationStatusData {
  status: EmployeeEvaluationStatus;
  notes?: string;
}

export type ListEmployeeEvaluationsParams = {
  page?: number;
  per_page?: number;
  search?: string;
  status?: EmployeeEvaluationStatus;
  evaluation_type?: EvaluationType;
  employee_id?: string;
};

// ---- API Response Types ----

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface EvaluationAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface EvaluationAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: EvaluationAuditTrailUser | null;
  created_at: string;
}

export type EvaluationAuditTrailParams = {
  page?: number;
  per_page?: number;
};

export interface EvaluationGroupListResponse {
  success: boolean;
  data: EvaluationGroup[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface EvaluationGroupSingleResponse {
  success: boolean;
  data: EvaluationGroup;
  timestamp: string;
  request_id: string;
}

export interface EvaluationCriteriaListResponse {
  success: boolean;
  data: EvaluationCriteria[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface EvaluationCriteriaSingleResponse {
  success: boolean;
  data: EvaluationCriteria;
  timestamp: string;
  request_id: string;
}

export interface EmployeeEvaluationListResponse {
  success: boolean;
  data: EmployeeEvaluation[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface EmployeeEvaluationSingleResponse {
  success: boolean;
  data: EmployeeEvaluation;
  timestamp: string;
  request_id: string;
}

export interface EvaluationAuditTrailListResponse {
  success: boolean;
  data: EvaluationAuditTrailEntry[];
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

// ---- Form Data Response ----

export interface EmployeeEvaluationFormDataResponse {
  success: boolean;
  data: {
    employees: EmployeeSimple[];
    evaluation_groups: EvaluationGroupSimple[];
    evaluation_types: EvaluationTypeOption[];
    statuses: EvaluationStatusOption[];
  };
  timestamp: string;
  request_id: string;
}
