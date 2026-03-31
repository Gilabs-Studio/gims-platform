// ============================================
// Supplier Module Types
// ============================================

// === Supplier Type ===
export interface SupplierType {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierPaymentTerms {
  id: string;
  code: string;
  name: string;
  days: number;
}

export interface SupplierBusinessUnit {
  id: string;
  name: string;
}

export interface CreateSupplierTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateSupplierTypeData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === Bank ===
export interface Bank {
  id: string;
  name: string;
  code: string;
  swift_code?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankData {
  name: string;
  code: string;
  swift_code?: string;
  is_active?: boolean;
}

export interface UpdateBankData {
  name?: string;
  code?: string;
  swift_code?: string;
  is_active?: boolean;
}

// === Supplier Contact ===
export interface SupplierContact {
  id: string;
  supplier_id: string;
  contact_role_id?: string;
  contact_role?: {
    id: string;
    name: string;
    code: string;
    badge_color: string;
  };
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  is_primary: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  contact_role_id?: string;
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  is_primary?: boolean;
  is_active?: boolean;
}

export interface UpdateContactData extends Partial<CreateContactData> {}

// Backward-compat aliases for old naming
export type SupplierPhoneNumber = SupplierContact;
export type CreatePhoneNumberData = CreateContactData;
export type UpdatePhoneNumberData = UpdateContactData;

// === Supplier Bank Account ===
export interface SupplierBank {
  id: string;
  supplier_id: string;
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

export interface CreateSupplierBankData {
  bank_id: string;
  currency_id: string;
  account_number: string;
  account_name: string;
  branch?: string;
  is_primary?: boolean;
}

export interface UpdateSupplierBankData {
  bank_id?: string;
  currency_id?: string;
  account_number?: string;
  account_name?: string;
  branch?: string;
  is_primary?: boolean;
}

// === Supplier Status ===
export type SupplierStatus = "draft" | "pending" | "approved" | "rejected";

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

// === Supplier ===
export interface Supplier {
  id: string;
  code: string;
  name: string;
  supplier_type_id?: string;
  supplier_type?: SupplierType;
  payment_terms_id?: string;
  payment_terms?: SupplierPaymentTerms;
  business_unit_id?: string;
  business_unit?: SupplierBusinessUnit;
  address?: string;
  province_id?: string;
  province?: { id: string; name: string };
  city_id?: string;
  city?: { id: string; name: string };
  district_id?: string;
  district?: { id: string; name: string };
  village_id?: string;
  village_name?: string;
  village?: Village;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: SupplierStatus;
  is_approved: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contacts?: SupplierContact[];
  phone_numbers?: SupplierContact[];
  bank_accounts?: SupplierBank[];
}

export interface CreateSupplierData {
  name: string;
  supplier_type_id?: string;
  payment_terms_id?: string;
  business_unit_id?: string;
  address?: string;
  province_id?: string;
  city_id?: string;
  district_id?: string;
  village_id?: string;
  village_name?: string;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean;
  contacts?: CreateContactData[];
  bank_accounts?: CreateSupplierBankData[];
}

export interface UpdateSupplierData {
  name?: string;
  supplier_type_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
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
}

export interface ApproveSupplierData {
  action: "approve" | "reject";
  reason?: string;
}

// === API Response Types ===
export interface SupplierListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  supplier_type_id?: string;
  status?: SupplierStatus;
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

export interface SupplierListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
  };
  error?: string;
}

export interface SupplierSingleResponse<T> {
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
