// Sales Visit types for Sprint 7

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  image_url?: string;
}

export interface Village {
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

export interface SalesVisitDetail {
  id: string;
  sales_visit_id: string;
  product_id: string;
  product?: Product;
  interest_level: number;
  notes: string;
  quantity?: number;
  price?: number;
  answers?: SalesVisitInterestAnswer[];
  created_at: string;
  updated_at: string;
}

export interface SalesVisitInterestQuestion {
  id: string;
  question_text: string;
  sequence: number;
  options: SalesVisitInterestOption[];
}

export interface SalesVisitInterestOption {
  id: string;
  option_text: string;
  score: number;
}

export interface SalesVisitInterestAnswer {
  id: string;
  question_id: string;
  question_text?: string;
  option_id: string;
  option_text?: string;
  score: number;
}

export interface SalesVisitInterestQuestionsResponse {
  success: boolean;
  data: SalesVisitInterestQuestion[];
  timestamp: string;
  request_id: string;
}

export interface SalesVisitProgressHistory {
  id: string;
  sales_visit_id: string;
  from_status: string;
  to_status: string;
  notes: string;
  changed_by?: string;
  created_at: string;
}

export type SalesVisitStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface SalesVisit {
  id: string;
  code: string;
  visit_date: string;
  scheduled_time?: string;
  actual_time?: string;
  employee_id: string;
  employee?: Employee;
  company_id?: string;
  company?: Company;
  contact_person: string;
  contact_phone: string;
  address: string;
  village_id?: string;
  village?: Village;
  latitude?: number;
  longitude?: number;
  purpose: string;
  notes: string;
  result: string;
  status: SalesVisitStatus;
  check_in_at?: string;
  check_out_at?: string;
  created_by?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  details?: SalesVisitDetail[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListSalesVisitsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SalesVisitStatus;
  employee_id?: string;
  company_id?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// List details request params
export interface ListSalesVisitDetailsParams {
  page?: number;
  per_page?: number;
}

// List history request params
export interface ListSalesVisitProgressHistoryParams {
  page?: number;
  per_page?: number;
}

// API Response types
export interface SalesVisitListResponse {
  success: boolean;
  data: SalesVisit[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface SalesVisitSingleResponse {
  success: boolean;
  data: SalesVisit;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

export interface SalesVisitDetailsListResponse {
  success: boolean;
  data: SalesVisitDetail[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  timestamp: string;
  request_id: string;
}

export interface SalesVisitProgressHistoryListResponse {
  success: boolean;
  data: SalesVisitProgressHistory[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  timestamp: string;
  request_id: string;
}

// Form data types for create/update
export interface CreateSalesVisitData {
  visit_date: string;
  scheduled_time?: string;
  employee_id: string;
  company_id?: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  village_id?: string;
  purpose?: string;
  notes?: string;
  details?: CreateSalesVisitDetailData[];
}

export interface CreateSalesVisitDetailData {
  product_id: string;
  interest_level?: number;
  notes?: string;
  quantity?: number;
  price?: number;
  answers?: CreateSalesVisitInterestAnswerData[];
}

export interface CreateSalesVisitInterestAnswerData {
  question_id: string;
  option_id: string;
}

export interface UpdateSalesVisitData {
  visit_date?: string;
  scheduled_time?: string;
  employee_id?: string;
  company_id?: string;
  contact_person?: string;
  contact_phone?: string;
  address?: string;
  village_id?: string;
  purpose?: string;
  notes?: string;
  result?: string;
  details?: CreateSalesVisitDetailData[];
}

export interface UpdateSalesVisitStatusData {
  status: SalesVisitStatus;
  notes?: string;
}

export interface CheckInData {
  latitude?: number;
  longitude?: number;
}

export interface CheckOutData {
  result?: string;
}

export interface CalendarPreviewItem {
  id: string;
  code: string;
  scheduled_time: string;
  customer_name: string;
  status: string; // Not strictly enum, simple string from sql
}

export interface CalendarDaySummary {
  date: string;
  total_count: number;
  planned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  preview_items: CalendarPreviewItem[];
}

export interface CalendarSummaryResponse {
  success: boolean;
  data: {
    summary: CalendarDaySummary[];
  };
}

export interface GetCalendarSummaryParams {
  date_from: string;
  date_to: string;
  employee_id?: string;
  company_id?: string;
}
