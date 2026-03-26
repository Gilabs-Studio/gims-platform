// CRM Visit Report Types

export type VisitReportStatus = "draft" | "submitted" | "approved" | "rejected";
export type VisitReportOutcome = "positive" | "neutral" | "negative" | "very_positive";

// Brief entity representations
export interface VisitCustomerBrief {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface VisitContactBrief {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface VisitDealBrief {
  id: string;
  code: string;
  title: string;
}

export interface VisitLeadBrief {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
}

export interface VisitEmployeeBrief {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
}

export interface VisitProductBrief {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  image_url: string;
}

export interface VisitVillageResponse {
  id: string;
  name: string;
  district?: {
    id: string;
    name: string;
    regency?: {
      id: string;
      name: string;
      province?: {
        id: string;
        name: string;
      };
    };
  };
}

// Interest survey types (reused from SalesVisit)
export interface VisitInterestQuestion {
  id: string;
  question_text: string;
  sequence: number;
  options: VisitInterestOption[];
}

export interface VisitInterestOption {
  id: string;
  option_text: string;
  score: number;
}

export interface VisitReportInterestAnswer {
  id: string;
  question_id: string;
  question_text: string;
  option_id: string;
  option_text: string;
  score: number;
}

// Visit report detail (product interest)
export interface VisitReportDetail {
  id: string;
  visit_report_id: string;
  product_id: string;
  product?: VisitProductBrief | null;
  interest_level: number;
  notes: string;
  quantity?: number | null;
  price?: number | null;
  answers?: VisitReportInterestAnswer[];
  created_at: string;
  updated_at: string;
}

// Progress history
export interface VisitReportProgressHistory {
  id: string;
  visit_report_id: string;
  from_status: string;
  to_status: string;
  notes: string;
  changed_by?: string | null;
  created_at: string;
}

// Main visit report entity
export interface VisitReport {
  id: string;
  code: string;
  customer_id?: string | null;
  customer?: VisitCustomerBrief | null;
  contact_id?: string | null;
  contact?: VisitContactBrief | null;
  deal_id?: string | null;
  deal?: VisitDealBrief | null;
  lead_id?: string | null;
  lead?: VisitLeadBrief | null;
  employee_id: string;
  employee?: VisitEmployeeBrief | null;
  visit_date: string;
  scheduled_time?: string | null;
  actual_time?: string | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_location?: string | null;
  check_out_location?: string | null;
  address: string;
  village_id?: string | null;
  village?: VisitVillageResponse | null;
  latitude?: number | null;
  longitude?: number | null;
  purpose: string;
  notes: string;
  result: string;
  outcome: string;
  next_steps: string;
  contact_person: string;
  contact_phone: string;
  photos?: string | null;
  status: VisitReportStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason: string;
  created_by?: string | null;
  details?: VisitReportDetail[];
  created_at: string;
  updated_at: string;
}

// Request types
export interface CreateVisitReportData {
  visit_date: string;
  scheduled_time?: string;
  employee_id: string;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  village_id?: string | null;
  purpose?: string;
  notes?: string;
  details?: CreateVisitReportDetailData[];
}

export interface CreateVisitReportDetailData {
  product_id: string;
  interest_level?: number;
  notes?: string;
  quantity?: number;
  price?: number;
  answers?: CreateVisitInterestAnswerData[];
}

export interface CreateVisitInterestAnswerData {
  question_id: string;
  option_id: string;
}

export interface UpdateVisitReportData {
  visit_date?: string;
  scheduled_time?: string;
  employee_id?: string;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  village_id?: string | null;
  purpose?: string;
  notes?: string;
  result?: string;
  outcome?: string;
  next_steps?: string;
  details?: CreateVisitReportDetailData[];
}

export interface VisitReportListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: VisitReportStatus;
  customer_id?: string;
  employee_id?: string;
  contact_id?: string;
  deal_id?: string;
  lead_id?: string;
  outcome?: VisitReportOutcome;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface CheckInData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface CheckOutData {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  result?: string;
  outcome?: string;
  next_steps?: string;
}

export interface SubmitVisitData {
  notes?: string;
}

export interface ApproveVisitData {
  notes?: string;
}

export interface RejectVisitData {
  reason: string;
  notes?: string;
}

// Form data for dropdowns
export interface VisitReportFormDataResponse {
  customers: VisitFormDataCustomer[];
  contacts: VisitFormDataContact[];
  employees: VisitFormDataEmployee[];
  deals: VisitFormDataDeal[];
  leads: VisitFormDataLead[];
  products: VisitFormDataProduct[];
  outcomes: VisitFormDataOption[];
  statuses: VisitFormDataOption[];
}

export interface VisitFormDataCustomer {
  id: string;
  name: string;
}

export interface VisitFormDataContact {
  id: string;
  name: string;
  customer_id: string;
}

export interface VisitFormDataEmployee {
  id: string;
  employee_code: string;
  name: string;
}

export interface VisitFormDataDeal {
  id: string;
  code: string;
  title: string;
}

export interface VisitFormDataLead {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
}

export interface VisitFormDataProduct {
  id: string;
  code: string;
  name: string;
  selling_price: number;
}

export interface VisitFormDataOption {
  value: string;
  label: string;
}

// API Response types
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

// Employee-level visit report summary (for ALL/DIVISION/AREA scope card view)
export interface VisitReportStatusCounts {
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface VisitReportEmployeeSummary {
  employee_id: string;
  employee_code: string;
  employee_name: string;
  total_reports: number;
  latest_visit: string;
  status_counts: VisitReportStatusCounts;
}

export interface VisitReportEmployeeListParams {
  page?: number;
  per_page?: number;
  search?: string;
}
