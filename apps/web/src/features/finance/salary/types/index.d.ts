export interface ApiResponse<T> {
  data: T;
  meta?: { total: number; page: number; per_page: number };
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  effective_date: string;
  basic_salary: number;
  notes: string;
  status: "draft" | "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface SalaryStructureInput {
  employee_id: string;
  effective_date: string;
  basic_salary: number;
  notes?: string;
}

export interface ListSalaryParams {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
}
