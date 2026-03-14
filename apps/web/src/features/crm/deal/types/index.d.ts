// CRM Deal Types

export interface Deal {
  id: string;
  code: string;
  title: string;
  description: string;
  status: DealStatus;
  pipeline_stage_id: string;
  pipeline_stage?: DealPipelineStageInfo | null;
  value: number;
  probability: number;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  close_reason: string;
  customer_id?: string | null;
  customer?: DealCustomerInfo | null;
  contact_id?: string | null;
  contact?: DealContactInfo | null;
  assigned_to?: string | null;
  assigned_employee?: DealEmployeeInfo | null;
  lead_id?: string | null;
  lead?: DealLeadInfo | null;
  bank_account_id?: string | null;
  bank_account_reference?: string;
  // Optional web/visit report fields (may be present at runtime)
  website?: string;
  visit_report?: string;
  // BANT
  budget_confirmed: boolean;
  budget_amount: number;
  auth_confirmed: boolean;
  auth_person: string;
  need_confirmed: boolean;
  need_description: string;
  time_confirmed: boolean;
  // Items
  items: DealProductItem[];
  // Conversion tracking
  converted_to_quotation_id?: string | null;
  converted_at?: string | null;
  // Metadata
  notes: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type DealStatus = "open" | "won" | "lost";

export interface DealPipelineStageInfo {
  id: string;
  name: string;
  code: string;
  color: string;
  order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface DealCustomerInfo {
  id: string;
  code: string;
  name: string;
}

export interface DealContactInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface DealEmployeeInfo {
  id: string;
  employee_code: string;
  name: string;
}

export interface DealLeadInfo {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  // Optional fields mirrored from Lead entity
  website?: string;
  visit_report?: string;
}

export interface DealProductItem {
  id: string;
  deal_id: string;
  product_id?: string | null;
  product_name: string;
  product_sku: string;
  unit_price: number;
  quantity: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  notes: string;
  interest_level?: number;
  is_deleted?: boolean;
}

export interface DealHistory {
  id: string;
  deal_id: string;
  from_stage_id?: string | null;
  from_stage?: DealPipelineStageInfo | null;
  from_stage_name: string;
  to_stage_id: string;
  to_stage?: DealPipelineStageInfo | null;
  to_stage_name: string;
  from_probability: number;
  to_probability: number;
  days_in_prev_stage: number;
  changed_by?: string | null;
  changed_by_user?: DealEmployeeInfo | null;
  changed_at: string;
  reason: string;
  notes: string;
}

// Request types

export interface CreateDealData {
  title: string;
  description?: string;
  pipeline_stage_id: string;
  value?: number;
  expected_close_date?: string | null;
  customer_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;
  lead_id?: string | null;
  bank_account_id?: string | null;
  bank_account_reference?: string;
  budget_confirmed?: boolean;
  budget_amount?: number;
  auth_confirmed?: boolean;
  auth_person?: string;
  need_confirmed?: boolean;
  need_description?: string;
  time_confirmed?: boolean;
  notes?: string;
  items?: CreateDealProductItemData[];
}

export interface CreateDealProductItemData {
  product_id?: string | null;
  product_name: string;
  product_sku?: string;
  unit_price: number;
  quantity: number;
  discount_percent?: number;
  discount_amount?: number;
  notes?: string;
}

export interface UpdateDealData {
  title?: string;
  description?: string;
  pipeline_stage_id?: string;
  value?: number;
  expected_close_date?: string | null;
  customer_id?: string | null;
  contact_id?: string | null;
  assigned_to?: string | null;
  lead_id?: string | null;
  bank_account_id?: string | null;
  bank_account_reference?: string;
  budget_confirmed?: boolean;
  budget_amount?: number;
  auth_confirmed?: boolean;
  auth_person?: string;
  need_confirmed?: boolean;
  need_description?: string;
  time_confirmed?: boolean;
  notes?: string;
  items?: CreateDealProductItemData[];
}

export interface MoveDealStageData {
  to_stage_id: string;
  reason: string;
  notes?: string;
  close_reason?: string;
  convert_to_quotation?: boolean;
}

export interface MoveDealStageResponse {
  deal: Deal;
  conversion?: ConvertToQuotationResponse | null;
}

export interface DealListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  status?: string;
  pipeline_stage_id?: string;
  customer_id?: string;
  assigned_to?: string;
  lead_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface DealsByStageParams {
  stage_id: string;
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

// Form Data types

export interface DealFormDataResponse {
  employees: DealEmployeeOption[];
  customers: DealCustomerOption[];
  contacts: DealContactOption[];
  pipeline_stages: DealPipelineStageOption[];
  products: DealProductOption[];
  leads: DealLeadOption[];
}

export interface DealEmployeeOption {
  id: string;
  employee_code: string;
  name: string;
}

export interface DealCustomerOption {
  id: string;
  code: string;
  name: string;
}

export interface DealContactOption {
  id: string;
  name: string;
  phone: string;
  email: string;
  customer_id: string;
}

export interface DealPipelineStageOption {
  id: string;
  name: string;
  code: string;
  color: string;
  order: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface DealProductOption {
  id: string;
  code: string;
  name: string;
  sku: string;
  selling_price: number;
}

export interface DealLeadOption {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  company_name: string;
  is_converted: boolean;
}

// Summary & Forecast

export interface DealPipelineSummary {
  total_deals: number;
  total_value: number;
  open_deals: number;
  open_value: number;
  won_deals: number;
  won_value: number;
  lost_deals: number;
  lost_value: number;
  by_stage: DealStageSummary[];
}

export interface DealStageSummary {
  stage_id: string;
  stage_name: string;
  stage_color: string;
  deal_count: number;
  total_value: number;
}

export interface DealForecast {
  total_weighted_value: number;
  total_deals: number;
  by_stage: DealStageForecast[];
}

export interface DealStageForecast {
  stage_id: string;
  stage_name: string;
  deal_count: number;
  total_value: number;
  probability: number;
  weighted_value: number;
}

// Shared types (reuse from lead if available, or define locally)

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

// --- Sprint 21: Deal → Sales Quotation Conversion + Stock Check ---

export interface ConvertToQuotationRequest {
  payment_terms_id?: string;
  business_unit_id?: string;
  business_type_id?: string;
  notes?: string;
}

export interface ConvertToQuotationResponse {
  deal_id: string;
  quotation_id: string;
  quotation_code: string;
}

export interface StockCheckItemResponse {
  product_id: string;
  product_name: string;
  requested_quantity: number;
  available_stock: number;
  reserved_stock: number;
  is_sufficient: boolean;
}

export interface StockCheckResponse {
  deal_id: string;
  items: StockCheckItemResponse[];
  all_sufficient: boolean;
}
