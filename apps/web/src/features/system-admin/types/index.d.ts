export interface SystemAdmin {
  id: string;
  email: string;
  name: string;
  username?: string;
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
    name: string;
    username: string;
    role: string;
  };
}

export interface SystemAdminUpdateProfileRequest {
  username: string;
  email: string;
}

export interface SystemAdminUpdateProfileResponse {
  success: boolean;
  data: SystemAdmin;
}

export interface SystemAdminChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface SystemAdminChangePasswordResponse {
  success: boolean;
  data: {
    message: string;
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
  deletion_requested_at?: string;
  deletion_scheduled_at?: string;
  deletion_requested_by?: string;
  deletion_previous_status?: string;
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
    business_health?: BusinessHealthSummary;
    plan_mix?: PlanMixItem[];
    billing_activity?: BillingActivitySummary;
    support_incidents?: SupportIncidentsSummary;
    tenant_overview?: TenantOverviewRow[];
    infrastructure_performance?: InfrastructurePerformanceSummary;
  };
}

export interface BusinessHealthSummary {
  mrr_idr: number;
  arr_idr: number;
  churn_rate_percent: number;
  net_revenue_retention_percent: number;
  total_tenant_aktif: number;
  total_seat_terjual: number;
  trial_aktif: number;
  overdue_invoice: number;
  suspended_tenant: number;
  delta_tenant_bulan_ini: number;
}

export interface PlanMixItem {
  plan: string;
  label: string;
  tenant_count: number;
  seat_count: number;
  share_percent: number;
}

export interface BillingActivitySummary {
  success_count: number;
  failed_retry: number;
  refund_process: number;
  upgrade_plan: number;
  add_seat: number;
}

export interface SupportIncidentsSummary {
  open_tickets: number;
  sla_breach: number;
  csat_average: number;
  active_incidents: number;
  todo_note: string;
  is_todo: boolean;
}

export interface TenantOverviewRow {
  tenant_name: string;
  plan: string;
  seat: number;
  status: string;
  mrr_idr?: number;
  joined_at: string;
}

export interface InfrastructurePerformanceSummary {
  uptime_30d_percent: number;
  api_latency_avg_ms: number;
  error_rate_percent: number;
  db_size_bytes: number;
  db_size_label: string;
  observation_note: string;
}

export interface RecentPayment {
  id: string;
  tenant_name: string;
  plan: string;
  billing_period: string;
  amount_paid_idr: number;
  coupon_code?: string;
  xendit_invoice_id?: string;
  notes?: string;
  starts_at: string;
  expires_at?: string | null;
  created_at: string;
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
  discount_type?: "trial" | "percent" | "amount";
  discount_value?: number;
  max_user_count?: number;
  lock_user_count?: boolean;
  package_price_monthly_idr?: number;
  package_price_yearly_idr?: number;
  scope?: "general" | "tier_specific";
  target_plan_slug?: string;
  duration_days: number;
  max_uses: number;
  max_uses_per_email?: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponRequest {
  code?: string;
  description: string;
  coupon_type: CouponType;
  discount_type?: "trial" | "percent" | "amount";
  discount_value?: number;
  max_user_count?: number;
  lock_user_count?: boolean;
  package_price_monthly_idr?: number;
  package_price_yearly_idr?: number;
  scope?: "general" | "tier_specific";
  target_plan_slug?: string;
  duration_days: number;
  max_uses?: number;
  max_uses_per_email?: number;
  expires_at?: string | null;
}

export type UpdateCouponRequest = CreateCouponRequest;

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
  next_billing_at?: string | null;
  coupon_id?: string | null;
  coupon_code?: string | null;
  amount_paid_idr?: number;
  xendit_payment_id?: string | null;
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
  role_templates: RoleTemplate[];
  modules: string[];
  menu_urls: string[];
}

export interface RoleTemplate {
  code?: string;
  name: string;
  description: string;
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
  role_templates: RoleTemplate[];
  modules?: string[];
  menu_urls?: string[];
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

// ── Permissions ────────────────────────────────────────────────────────────

export interface PermissionMenu {
  id: string;
  name: string;
  icon: string;
  url: string;
  access: boolean;
  parent_id?: string | null;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  action: string;
  resource: string;
  description: string;
  menu_id?: string | null;
  menu?: PermissionMenu | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionMenuOption {
  id: string;
  name: string;
  url: string;
  parent_id?: string | null;
  depth: number;
  label: string;
}

export interface PermissionListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface PermissionListResponse {
  success: boolean;
  data: Permission[];
  meta?: { pagination?: PaginationMeta };
}

export interface PermissionDetailResponse {
  success: boolean;
  data: Permission;
}

export interface PermissionMenuOptionResponse {
  success: boolean;
  data: PermissionMenuOption[];
}

export interface CreatePermissionRequest {
  name: string;
  code: string;
  action: string;
  resource?: string;
  description?: string;
  menu_id?: string | null;
}

export type UpdatePermissionRequest = CreatePermissionRequest;



// ── Support Feedback ───────────────────────────────────────────────────────

export interface SupportFeedback {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  tenant_id: string;
  tenant_name: string;
  message: string;
  image_url?: string;
  created_at: string;
}

export interface SupportFeedbackListResponse {
  success: boolean;
  data: SupportFeedback[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

