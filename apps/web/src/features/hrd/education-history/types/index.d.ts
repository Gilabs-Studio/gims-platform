// Employee Education History types for Sprint 14

export type DegreeLevel = 
  | "ELEMENTARY"
  | "JUNIOR_HIGH"
  | "SENIOR_HIGH"
  | "DIPLOMA"
  | "BACHELOR"
  | "MASTER"
  | "DOCTORATE";

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
}

export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface DegreeLevelOption {
  value: DegreeLevel;
  label: string;
}

export interface EmployeeEducationHistory {
  id: string;
  employee_id: string;
  institution: string;
  degree: DegreeLevel;
  field_of_study: string;
  start_date: string;
  end_date?: string | null;
  gpa?: number | null;
  description: string;
  document_path: string;
  is_completed: boolean;
  duration_years: number;
  created_at: string;
  updated_at: string;
}

export interface EducationHistoryFormData {
  employees: EmployeeFormOption[];
  degree_levels: DegreeLevelOption[];
}

export interface CreateEducationHistoryData {
  employee_id: string;
  institution: string;
  degree: DegreeLevel;
  field_of_study: string;
  start_date: string;
  end_date?: string;
  gpa?: number;
  description?: string;
  document_path?: string;
}

export interface UpdateEducationHistoryData {
  institution?: string;
  degree?: DegreeLevel;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  gpa?: number;
  description?: string;
  document_path?: string;
}

export interface ListEducationHistoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  degree?: DegreeLevel;
}

export interface EducationHistoryListResponse {
  success: boolean;
  data: EmployeeEducationHistory[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface EducationHistorySingleResponse {
  success: boolean;
  data: EmployeeEducationHistory;
  timestamp: string;
  request_id: string;
}

export interface EducationHistoryFormDataResponse {
  success: boolean;
  data: EducationHistoryFormData;
  timestamp: string;
  request_id: string;
}
