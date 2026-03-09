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
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_name?: string;
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
  deal?: LeadDealInfo | null;
  converted_at?: string | null;
  converted_by?: string | null;
  // Metadata
  notes: string;
  npwp?: string | null;
  // External
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  types?: string;
  opening_hours?: string;
  thumbnail_url?: string;
  cid?: string;
  place_id?: string;
  website?: string;
  // Sales defaults for customer conversion
  business_type_id?: string | null;
  business_type?: LeadBusinessTypeInfo | null;
  area_id?: string | null;
  area?: LeadAreaInfo | null;
  payment_terms_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  activities?: ActivityResponse[] | null;
  product_items?: LeadProductItem[] | null;
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

export interface LeadDealInfo {
  id: string;
  code: string;
  title: string;
  status: string;
  pipeline_stage_name: string;
}

export interface ActivityTypeInfo {
  id: string;
  name: string;
  code: string;
  icon: string;
  badge_color: string;
}

export interface ActivityEmployeeInfo {
  id: string;
  employee_code: string;
  name: string;
}

export interface ActivityResponse {
  id: string;
  type: string;
  activity_type_id?: string | null;
  activity_type?: ActivityTypeInfo | null;
  customer_id?: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
  lead_id?: string | null;
  visit_report_id?: string | null;
  employee_id: string;
  employee?: ActivityEmployeeInfo | null;
  description: string;
  timestamp: string;
  metadata?: string | null;
  created_at: string;
}

export interface LeadBusinessTypeInfo {
  id: string;
  name: string;
}

export interface LeadAreaInfo {
  id: string;
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
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_name?: string;
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
  website?: string;
  business_type_id?: string | null;
  area_id?: string | null;
  payment_terms_id?: string | null;
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
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_name?: string;
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
  website?: string;
  npwp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_type_id?: string | null;
  area_id?: string | null;
  payment_terms_id?: string | null;
}

export interface ConvertLeadData {
  pipeline_stage_id?: string;
  deal_title?: string;
  deal_value?: number;
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

// n8n Lead Generation Types
export type LeadGenerateSource = "linkedin" | "google_maps";

export interface GenerateLeadsInput {
  type: LeadGenerateSource;
  keyword: string;
  city: string;
  limit: number;
}

export interface BulkUpsertLeadItem {
  first_name: string;
  last_name?: string;
  company_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  address?: string;
  city?: string;
  province?: string;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_name?: string;
  lead_source_id?: string | null;
  estimated_value?: number;
  notes?: string;
  // External
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  types?: string;
  opening_hours?: string;
  thumbnail_url?: string;
  cid?: string;
  place_id?: string;
  website?: string;
}

export interface BulkUpsertLeadRequest {
  leads: BulkUpsertLeadItem[];
}

export interface BulkUpsertLeadResponse {
  created: number;
  updated: number;
  errors: number;
  items: Lead[];
}

export interface LeadFormDataResponse {
  employees: LeadEmployeeOption[];
  lead_sources: LeadSourceOption[];
  lead_statuses: LeadStatusOption[];
  pipeline_stages: LeadPipelineStageOption[];
  business_types: LeadBusinessTypeOption[];
  areas: LeadAreaOption[];
  payment_terms: LeadPaymentTermsOption[];
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
  order?: number;
}

export interface LeadStatusOption {
  id: string;
  name: string;
  code: string;
  color: string;
  order?: number;
  is_default: boolean;
  is_converted: boolean;
}

export interface LeadPipelineStageOption {
  id: string;
  name: string;
  code: string;
  order: number;
  probability: number;
}

export interface LeadBusinessTypeOption {
  id: string;
  name: string;
}

export interface LeadAreaOption {
  id: string;
  name: string;
  province?: string;
}

export interface LeadPaymentTermsOption {
  id: string;
  name: string;
  code: string;
  days: number;
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

export interface LeadProductItem {
  id: string;
  lead_id: string;
  product_id?: string | null;
  product_name: string;
  product_sku: string;
  interest_level: number;
  quantity: number;
  unit_price: number;
  notes: string;
  source_visit_report_id?: string | null;
  last_survey_answers?: string | null;
  created_at: string;
}
