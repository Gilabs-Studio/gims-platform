// CRM Contact Types

export interface Contact {
  id: string;
  customer_id: string;
  customer?: ContactCustomerInfo;
  contact_role_id?: string | null;
  contact_role?: ContactRoleInfo | null;
  name: string;
  phone: string;
  email: string;
  notes: string;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactCustomerInfo {
  id: string;
  code: string;
  name: string;
}

export interface ContactRoleInfo {
  id: string;
  name: string;
  code: string;
  badge_color: string;
}

export interface CreateContactData {
  customer_id: string;
  contact_role_id?: string | null;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateContactData {
  customer_id?: string;
  contact_role_id?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  is_active?: boolean;
}

export interface ContactListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  customer_id?: string;
  contact_role_id?: string;
}

export interface ContactFormDataResponse {
  customers: ContactCustomerOption[];
  contact_roles: ContactRoleOptionForForm[];
}

export interface ContactCustomerOption {
  id: string;
  code: string;
  name: string;
}

export interface ContactRoleOptionForForm {
  id: string;
  name: string;
  code: string;
  badge_color: string;
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
