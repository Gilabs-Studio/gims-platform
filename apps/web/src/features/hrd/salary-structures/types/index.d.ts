// Employee info embedded in salary response
export interface SalaryEmployee {
  id: string;
  name: string;
  employee_code: string;
  email: string;
  avatar_url?: string;
}

// Full salary structure with employee data
export interface SalaryStructure {
  id: string;
  employee_id: string;
  employee: SalaryEmployee;
  effective_date: string;
  basic_salary: number;
  notes?: string;
  status: "draft" | "active" | "inactive";
  created_at: string;
  updated_at: string;
}

// Group of salary records per employee
export interface SalaryEmployeeGroup {
  employee_id: string;
  employee: SalaryEmployee;
  salary_count: number;
  salaries: SalaryStructure[];
}

// Stats response
export interface SalaryTotalSalaryPoint {
  period: string;
  total_salary: number;
}

export interface SalaryStats {
  total: number;
  active: number;
  draft: number;
  inactive: number;
  average_salary: number;
  min_salary: number;
  max_salary: number;
  total_salary_over_time: SalaryTotalSalaryPoint[];
}

// Create/update input
export interface SalaryStructureInput {
  employee_id: string;
  effective_date: string;
  basic_salary: number;
  notes?: string;
}

// List params
export interface ListSalaryParams {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
}

// Form data for dropdowns
export interface EmployeeFormOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface SalaryFormData {
  employees: EmployeeFormOption[];
}

// Standard API wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { total: number; page: number; per_page: number };
}

// Chart types
export interface ChartDataPoint {
  period: string;
  salary: number;
  draftHighlight: number | null;
  status: string;
  fullDate: string;
  notes?: string;
  id: string;
  index: number;
  originalSalary: number;
  color: string;
}

export interface ChartDotProps {
  cx: number;
  cy: number;
  payload: ChartDataPoint;
}

export interface ChartTooltipPayload {
  payload?: ChartDataPoint;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
}

// Modal state
export interface SalaryModalState {
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isApproveModalOpen: boolean;
  selectedSalaryId: string | null;
}
