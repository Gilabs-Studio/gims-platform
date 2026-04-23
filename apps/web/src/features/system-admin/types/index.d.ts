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

// ── Coupons ────────────────────────────────────────────────────────────────

export type CouponType =
  | "full_access"
  | "pos_only"
  | "erp_only"
  | "crm_only"
  | "hr_only";

export interface Coupon {
  id: string;
  code: string;
  description: string;
  coupon_type: CouponType;
  duration_days: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponRequest {
  description: string;
  coupon_type: CouponType;
  duration_days: number;
  max_uses?: number;
  expires_at?: string | null;
}

export interface CouponListParams {
  active_only?: boolean;
  page?: number;
  per_page?: number;
}

export interface CouponListResponse {
  success: boolean;
  data: Coupon[];
  meta?: { pagination?: PaginationMeta };
}

export interface CouponDetailResponse {
  success: boolean;
  data: Coupon;
}

// ── Subscriptions ──────────────────────────────────────────────────────────

export type SubscriptionPlan =
  | "pos_essential"
  | "pos_growth"
  | "pos_enterprise"
  | "erp_core"
  | "erp_pro"
  | "erp_enterprise"
  | "crm_basic"
  | "crm_growth"
  | "crm_enterprise"
  | "hr_basic"
  | "hr_growth"
  | "hr_enterprise"
  | "full_access";

export type BillingPeriod = "monthly" | "yearly" | "lifetime";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "trial";

export interface Subscription {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  plan: SubscriptionPlan;
  billing_period: BillingPeriod;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
  coupon_id?: string | null;
  coupon_code?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionListParams {
  tenant_id?: string;
  status?: SubscriptionStatus;
  page?: number;
  per_page?: number;
}

export interface SubscriptionListResponse {
  success: boolean;
  data: Subscription[];
  meta?: { pagination?: PaginationMeta };
}

export interface SubscriptionDetailResponse {
  success: boolean;
  data: Subscription;
}

// ── Subscription Plans ─────────────────────────────────────────────────────

export type PlanCategory = "pos" | "erp" | "crm" | "hr" | "bundle";
export type PlanBillingType = "per_user" | "flat";

export interface SubscriptionPlanConfig {
  slug: string;
  name: string;
  category: PlanCategory;
  description?: string;
  billing_type: PlanBillingType;
  price_monthly_idr: number;
  price_yearly_idr: number;
  min_users: number;
  max_users: number;
  is_active: boolean;
  is_highlighted: boolean;
  sort_order: number;
  features: string[];
  modules: string[];
}

export interface UpsertPlanRequest {
  slug: string;
  name: string;
  category: PlanCategory;
  description?: string;
  billing_type: PlanBillingType;
  price_monthly_idr: number;
  price_yearly_idr: number;
  min_users?: number;
  max_users?: number;
  is_highlighted?: boolean;
  sort_order?: number;
  features?: string[];
  modules?: string[];
}

export interface PlanListResponse {
  success: boolean;
  data: SubscriptionPlanConfig[];
  meta?: { pagination?: PaginationMeta };
}

export interface PlanDetailResponse {
  success: boolean;
  data: SubscriptionPlanConfig;
}
