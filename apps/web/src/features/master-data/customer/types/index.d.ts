// ============================================
// Customer Module Types
// ============================================

// === Customer Type ===
export interface CustomerType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCustomerTypeData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === Bank (reused from Supplier module) ===
export interface Bank {
  id: string;
  name: string;
  code: string;
  swift_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// === Customer Bank Account ===
export interface CustomerBank {
  id: string;
  customer_id: string;
  bank_id: string;
  bank?: Bank;
  currency_id?: string | null;
  currency?: {
    id: string;
    code: string;
    name: string;
    symbol?: string;
  } | null;
  account_number: string;
  account_name: string;
  branch?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerBankData {
  bank_id: string;
  currency_id: string;
  account_number: string;
  account_name: string;
  branch?: string;
  is_primary?: boolean;
}

export interface UpdateCustomerBankData {
  bank_id?: string;
  currency_id?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
  is_primary?: boolean;
}

// === Village (Nested from Geographic) ===
export interface Village {
  id: string;
  name: string;
  district?: {
    id: string;
    name: string;
    city?: {
      id: string;
      name: string;
      province?: {
        id: string;
        name: string;
      };
    };
  };
}

// === Customer ===
export interface Customer {
  id: string;
  code: string;
  name: string;
  customer_type_id?: string;
  customer_type?: CustomerType;
  address?: string;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  village_name?: string | null;
  province?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
  district?: { id: string; name: string } | null;
  village?: Village;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  created_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bank_accounts?: CustomerBank[];
  // Sales defaults
  default_business_type_id?: string | null;
  default_business_type?: SalesDefaultOptionBrief | null;
  default_area_id?: string | null;
  default_area?: SalesDefaultOptionBrief | null;
  default_sales_rep_id?: string | null;
  default_sales_rep?: SalesRepBrief | null;
  default_payment_terms_id?: string | null;
  default_payment_terms?: SalesDefaultOptionBrief | null;
  default_tax_rate?: number | null;
  // Credit control
  credit_limit?: number;
  credit_is_active?: boolean;
  // CRM enrichment
  contacts_count?: number;
}

// Lightweight brief types used for sales defaults
export interface SalesDefaultOptionBrief {
  id: string;
  name: string;
  province?: string;
}

export interface SalesRepBrief {
  id: string;
  employee_code: string;
  name: string;
}

export interface CreateCustomerData {
  code?: string;
  name: string;
  customer_type_id?: string | null;
  address?: string;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  village_name?: string | null;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
  bank_accounts?: CreateCustomerBankData[];
  // Sales defaults
  default_business_type_id?: string | null;
  default_area_id?: string | null;
  default_sales_rep_id?: string | null;
  default_payment_terms_id?: string | null;
  default_tax_rate?: number | null;
  credit_limit?: number;
  credit_is_active?: boolean;
}

export interface UpdateCustomerData {
  code?: string | null;
  name?: string | null;
  customer_type_id?: string | null;
  address?: string | null;
  province_id?: string | null;
  city_id?: string | null;
  district_id?: string | null;
  village_id?: string | null;
  village_name?: string | null;
  email?: string | null;
  website?: string | null;
  npwp?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
  // Sales defaults
  default_business_type_id?: string | null;
  default_area_id?: string | null;
  default_sales_rep_id?: string | null;
  default_payment_terms_id?: string | null;
  default_tax_rate?: number | null;
  credit_limit?: number;
  credit_is_active?: boolean;
}

// === Form Data Response ===
export interface CustomerFormDataResponse {
  customer_types: CustomerType[];
  business_types: SalesDefaultOptionBrief[];
  areas: SalesDefaultOptionBrief[];
  sales_reps: SalesRepBrief[];
  payment_terms: PaymentTermsFormOption[];
}

export interface PaymentTermsFormOption {
  id: string;
  code: string;
  name: string;
  days: number;
}

// === API Response Types ===
export interface CustomerListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  customer_type_id?: string;
  is_approved?: boolean;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CustomerListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  error?: string;
}

export interface CustomerSingleResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}

// === Common List Params ===
export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}
