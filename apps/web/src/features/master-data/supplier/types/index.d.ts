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

// === Supplier Phone Number ===
export interface SupplierPhoneNumber {
  id: string;
  supplier_id: string;
  phone_number: string;
  label?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePhoneNumberData {
  phone_number: string;
  label?: string;
  is_primary?: boolean;
}

export interface UpdatePhoneNumberData {
  phone_number?: string;
  label?: string;
  is_primary?: boolean;
}

// === Supplier Bank Account ===
export interface SupplierBank {
  id: string;
  supplier_id: string;
  bank_id: string;
  bank?: Bank;
  account_number: string;
  account_name: string;
  branch?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierBankData {
  bank_id: string;
  account_number: string;
  account_name: string;
  branch?: string;
  is_primary?: boolean;
}

export interface UpdateSupplierBankData {
  bank_id?: string;
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
  address?: string;
  village_id?: string;
  village?: Village;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  status: SupplierStatus;
  is_approved: boolean;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phone_numbers?: SupplierPhoneNumber[];
  bank_accounts?: SupplierBank[];
}

export interface CreateSupplierData {
  code: string;
  name: string;
  supplier_type_id?: string;
  address?: string;
  village_id?: string;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
  is_active?: boolean;
  phone_numbers?: CreatePhoneNumberData[];
  bank_accounts?: CreateSupplierBankData[];
}

export interface UpdateSupplierData {
  code?: string;
  name?: string;
  supplier_type_id?: string;
  address?: string;
  village_id?: string;
  email?: string;
  website?: string;
  npwp?: string;
  contact_person?: string;
  notes?: string;
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
