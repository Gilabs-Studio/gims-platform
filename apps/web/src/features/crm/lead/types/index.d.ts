// CRM Lead Types

export interface Lead {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  job_title: string;
  address: string;
  city: string;
  province: string;
  lead_source_id?: string | null;
  lead_source?: LeadSourceInfo | null;
  lead_status_id?: string | null;
  lead_status?: LeadStatusInfo | null;
  lead_score: number;
  probability: number;
  estimated_value: number;
  // BANT
  budget_confirmed: boolean;
  budget_amount: number;
  auth_confirmed: boolean;
  auth_person: string;
  need_confirmed: boolean;
  need_description: string;
  time_confirmed: boolean;
  time_expected?: string | null;
  // Assignment
  assigned_to?: string | null;
  assigned_employee?: LeadEmployeeInfo | null;
  // Conversion
  customer_id?: string | null;
  customer?: LeadCustomerInfo | null;
  contact_id?: string | null;
  deal_id?: string | null;
  converted_at?: string | null;
  converted_by?: string | null;
  // Metadata
  notes: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadSourceInfo {
  id: string;
  name: string;
  code: string;
}

export interface LeadStatusInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  score: number;
  is_converted: boolean;
}

export interface LeadEmployeeInfo {
  id: string;
  employee_code: string;
  name: string;
}

export interface LeadCustomerInfo {
  id: string;
  code: string;
  name: string;
}

export interface CreateLeadData {
  first_name: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  address?: string;
  city?: string;
  province?: string;
  lead_source_id?: string | null;
  lead_status_id?: string | null;
  estimated_value?: number;
  probability?: number;
  budget_confirmed?: boolean;
  budget_amount?: number;
  auth_confirmed?: boolean;
  auth_person?: string;
  need_confirmed?: boolean;
  need_description?: string;
  time_confirmed?: boolean;
  time_expected?: string | null;
  assigned_to?: string | null;
  notes?: string;
}

export interface UpdateLeadData {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  address?: string;
  city?: string;
  province?: string;
  lead_source_id?: string | null;
  lead_status_id?: string | null;
  estimated_value?: number;
  probability?: number;
  budget_confirmed?: boolean;
  budget_amount?: number;
  auth_confirmed?: boolean;
  auth_person?: string;
  need_confirmed?: boolean;
  need_description?: string;
  time_confirmed?: boolean;
  time_expected?: string | null;
  assigned_to?: string | null;
  notes?: string;
}

export interface ConvertLeadData {
  customer_id?: string | null;
  notes?: string;
}

export interface LeadListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  lead_status_id?: string;
  lead_source_id?: string;
  assigned_to?: string;
  score_min?: number;
  score_max?: number;
  date_from?: string;
  date_to?: string;
  is_converted?: string;
}

export interface LeadFormDataResponse {
  employees: LeadEmployeeOption[];
  lead_sources: LeadSourceOption[];
  lead_statuses: LeadStatusOption[];
  customers: LeadCustomerOption[];
}

export interface LeadEmployeeOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface LeadSourceOption {
  id: string;
  name: string;
  code: string;
}

export interface LeadStatusOption {
  id: string;
  name: string;
  code: string;
  color: string;
  is_default: boolean;
  is_converted: boolean;
}

export interface LeadCustomerOption {
  id: string;
  code: string;
  name: string;
}

export interface LeadAnalytics {
  total_leads: number;
  by_status: LeadCountByField[];
  by_source: LeadCountByField[];
  conversion_rate: number;
  avg_score: number;
}

export interface LeadCountByField {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: PaginationMeta; filters?: Record<string, unknown> };
  error?: string;
}
