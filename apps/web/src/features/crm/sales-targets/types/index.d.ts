export interface EmployeeSalesTarget {
  id: string;
  employee_id: string;
  employee?: {
    id: string;
    name: string;
    employee_code: string;
    email: string;
    phone: string;
  };
  year: number;
  total_target: number;
  total_actual: number;
  achievement_percent: number;
  notes: string;
  monthly_targets?: MonthlySalesTarget[];
  created_at: string;
  updated_at: string;
}

export interface MonthlySalesTarget {
  id: string;
  month: number;
  month_name: string;
  target_amount: number;
  actual_amount: number;
  achievement_percent: number;
  notes: string;
}

export interface ListSalesTargetsParams {
  page?: number;
  per_page?: number;
  year?: number;
  employee_id?: string;
  scope?: string; // e.g. OWN | AREA | DIVISION | ALL
  scope_id?: string; // optional identifier for scoped filters (e.g. area_id, division_id)
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface CreateMonthlyTargetInput {
  month: number;
  target_amount: number;
  notes?: string;
}

export interface CreateSalesTargetInput {
  employee_id: string;
  year: number;
  total_target: number;
  notes?: string;
  months: CreateMonthlyTargetInput[];
}

export interface UpdateMonthlyTargetInput {
  month: number;
  target_amount: number;
  notes?: string;
}

export interface UpdateSalesTargetInput {
  total_target?: number;
  notes?: string;
  months?: UpdateMonthlyTargetInput[];
}

export interface SalesTargetEmployeeOption {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
}
