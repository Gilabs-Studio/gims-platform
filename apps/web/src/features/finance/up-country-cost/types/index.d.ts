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
}

export interface UpCountryCost {
  id: string;
  code: string;
  purpose: string;
  location: string;
  start_date: string;
  end_date: string;
  status: "draft" | "approved";
  notes: string;
  employees: UpCountryCostEmployee[];
  items: UpCountryCostItem[];
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface UpCountryCostEmployeeInput {
  employee_id: string;
}

export interface UpCountryCostItemInput {
  cost_type: string;
  description?: string;
  amount: number;
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
  sort_by?: string;
  sort_dir?: string;
}
