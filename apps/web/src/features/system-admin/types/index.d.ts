export interface SystemAdmin {
  id: string;
  email: string;
  name: string;
  status: string;
}

export interface SystemAdminLoginRequest {
  email: string;
  password: string;
}

export interface SystemAdminLoginResponse {
  success: boolean;
  data: {
    admin: SystemAdmin;
    expires_in: number;
  };
}

export interface SystemAdminMeResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    role: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  max_users: number;
  current_users: number;
  company_count?: number;
  outlet_count?: number;
  warehouse_count?: number;
  owner_user_id?: string;
  owner_name?: string;
  owner_email?: string;
  created_at?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number | null;
  prev_page?: number | null;
}

export interface TenantListResponse {
  success: boolean;
  data: Tenant[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface TenantDetailResponse {
  success: boolean;
  data: Tenant;
}

export interface SystemAdminDashboardResponse {
  success: boolean;
  data: {
    total_tenants: number;
    tenants: Tenant[];
  };
}

export interface SystemAdminState {
  admin: SystemAdmin | null;
  isAuthenticated: boolean;
  isSessionVerified: boolean;
}

export interface TenantListParams {
  page?: number;
  per_page?: number;
  search?: string;
}
