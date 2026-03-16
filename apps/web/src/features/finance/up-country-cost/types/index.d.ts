export interface ApiResponse<T> {
  data: T;
  meta?: { total: number; page: number; per_page: number };
}

export interface UpCountryCostEmployee {
  id: string;
  employee_id: string;
}

export interface UpCountryCostItem {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  expense_date?: string | null;
}

export type UpCountryCostStatus =
  | "draft"
  | "submitted"
  | "manager_approved"
  | "finance_approved"
  | "paid"
  | "rejected";

export interface UpCountryCost {
  id: string;
  code: string;
  purpose: string;
  location: string;
  start_date: string;
  end_date: string;
  status: UpCountryCostStatus;
  notes: string;
  employees: UpCountryCostEmployee[];
  items: UpCountryCostItem[];
  total_amount: number;

  // Submission
  submitted_at?: string | null;
  submitted_by?: string | null;

  // Manager approval
  manager_approved_at?: string | null;
  manager_approved_by?: string | null;
  manager_comment?: string;

  // Finance approval
  finance_approved_at?: string | null;
  finance_approved_by?: string | null;

  // Payment
  paid_at?: string | null;
  paid_by?: string | null;

  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpCountryCostStats {
  total_requests: number;
  pending_approval: number;
  approved: number;
  total_amount: number;
}

export interface UpCountryCostEmployeeInput {
  employee_id: string;
}

export interface UpCountryCostItemInput {
  cost_type: string;
  description?: string;
  amount: number;
  expense_date?: string;
}

export interface UpCountryCostInput {
  purpose: string;
  location?: string;
  start_date: string;
  end_date: string;
  notes?: string;
  employees: UpCountryCostEmployeeInput[];
  items: UpCountryCostItemInput[];
}

export interface ListUpCountryCostParams {
  page?: number;
  per_page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  employee_id?: string;
  sort_by?: string;
  sort_dir?: string;
}
