// Sales Estimation types for Sprint 7

export interface PaymentTerms {
  id: string;
  code: string;
  name: string;
  description?: string;
  days: number;
}

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface BusinessUnit {
  id: string;
  name: string;
  description?: string;
}

export interface BusinessType {
  id: string;
  name: string;
  description?: string;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
}

// Brief customer from master data (embedded in sales responses)
export interface CustomerBrief {
  id: string;
  code: string;
  name: string;
  customer_type_id?: string;
  address?: string;
  email?: string;
  contact_person?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  image_url?: string;
}

export interface SalesQuotation {
  id: string;
  code: string;
  quotation_date: string;
  status: string;
}

export interface SalesEstimationItem {
  id: string;
  sales_estimation_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  estimated_price: number;
  discount: number;
  subtotal: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type SalesEstimationStatus = "draft" | "submitted" | "approved" | "rejected" | "converted";

export interface SalesEstimation {
  id: string;
  code: string;
  estimation_date: string;
  customer_id?: string;
  customer?: CustomerBrief;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  area_id?: string;
  area?: Area;
  sales_rep_id: string;
  sales_rep?: Employee;
  business_unit_id: string;
  business_unit?: BusinessUnit;
  business_type_id?: string;
  business_type?: BusinessType;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;
  probability: number;
  expected_close_date?: string;
  status: SalesEstimationStatus;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  converted_to_quotation_id?: string;
  converted_to_quotation?: SalesQuotation;
  converted_at?: string;
  items?: SalesEstimationItem[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListSalesEstimationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SalesEstimationStatus;
  date_from?: string;
  date_to?: string;
  sales_rep_id?: string;
  area_id?: string;
  business_unit_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// List items request params
export interface ListSalesEstimationItemsParams {
  page?: number;
  per_page?: number;
}

// API Response types
export interface SalesEstimationListResponse {
  success: boolean;
  data: SalesEstimation[];
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

export interface SalesEstimationSingleResponse {
  success: boolean;
  data: SalesEstimation;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Items list response with pagination
export interface SalesEstimationItemsListResponse {
  success: boolean;
  data: SalesEstimationItem[];
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
export interface CreateSalesEstimationData {
  estimation_date: string;
  customer_id?: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  expected_close_date?: string;
  probability: number;
  area_id?: string;
  sales_rep_id: string;
  business_unit_id: string;
  business_type_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  notes?: string;
  items: CreateSalesEstimationItemData[];
}

export interface CreateSalesEstimationItemData {
  product_id: string;
  quantity: number;
  estimated_price: number;
  discount?: number;
  notes?: string;
}

export interface UpdateSalesEstimationData {
  estimation_date?: string;
  customer_id?: string;
  customer_name?: string;
  customer_contact?: string;
  customer_email?: string;
  customer_phone?: string;
  expected_close_date?: string;
  probability?: number;
  area_id?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  business_type_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  notes?: string;
  items?: CreateSalesEstimationItemData[];
}

export interface UpdateSalesEstimationStatusData {
  status: SalesEstimationStatus;
  rejection_reason?: string;
}

export interface ConvertToQuotationData {
  quotation_date?: string;
  valid_until?: string;
  payment_terms_id: string;
  inherit_items?: boolean;
}

export interface ConvertToQuotationResponse {
  success: boolean;
  data: {
    quotation_id: string;
    quotation_code: string;
  };
  timestamp: string;
  request_id: string;
}
