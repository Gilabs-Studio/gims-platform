// Sales Quotation types for Sprint 5

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

export interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  image_url?: string;
}

export interface SalesProspect {
  id: string;
  company?: {
    name: string;
  };
}

export interface SalesQuotationItem {
  id: string;
  sales_quotation_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export type SalesQuotationStatus = "draft" | "sent" | "approved" | "rejected" | "converted";

export interface SalesQuotation {
  id: string;
  code: string;
  quotation_date: string;
  valid_until?: string;
  payment_terms_id?: string;
  payment_terms?: PaymentTerms;
  sales_rep_id?: string;
  sales_rep?: Employee;
  business_unit_id?: string;
  business_unit?: BusinessUnit;
  business_type_id?: string;
  business_type?: BusinessType;
  delivery_area_id?: string;
  sales_prospect?: SalesProspect;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;
  status: SalesQuotationStatus;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  converted_to_sales_order_id?: string;
  converted_at?: string;
  items?: SalesQuotationItem[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListSalesQuotationsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SalesQuotationStatus;
  date_from?: string;
  date_to?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// List items request params
export interface ListSalesQuotationItemsParams {
  page?: number;
  per_page?: number;
}

// API Response types
export interface SalesQuotationListResponse {
  success: boolean;
  data: SalesQuotation[];
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

export interface SalesQuotationSingleResponse {
  success: boolean;
  data: SalesQuotation;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Items list response with pagination
export interface SalesQuotationItemsListResponse {
  success: boolean;
  data: SalesQuotationItem[];
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
export interface CreateSalesQuotationData {
  quotation_date: string;
  valid_until?: string;
  payment_terms_id: string;
  sales_rep_id: string;
  business_unit_id: string;
  business_type_id?: string;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  notes?: string;
  items: CreateSalesQuotationItemData[];
}

export interface CreateSalesQuotationItemData {
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface UpdateSalesQuotationData {
  quotation_date?: string;
  valid_until?: string;
  payment_terms_id?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  business_type_id?: string;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  notes?: string;
  items?: CreateSalesQuotationItemData[];
}

export interface UpdateSalesQuotationStatusData {
  status: SalesQuotationStatus;
  rejection_reason?: string;
}
