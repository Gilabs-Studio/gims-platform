import axios from "axios";
import type {
  SystemAdminLoginRequest,
  SystemAdminLoginResponse,
  SystemAdminMeResponse,
  SystemAdminDashboardResponse,
  TenantListResponse,
  TenantDetailResponse,
  TenantListParams,
  CouponListResponse,
  CouponDetailResponse,
  CouponListParams,
  CreateCouponRequest,
  SubscriptionListResponse,
  SubscriptionDetailResponse,
  SubscriptionListParams,
} from "../types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087";

// Separate axios instance for system admin API calls (/internal/*)
const sysAdminClient = axios.create({
  baseURL: `${API_BASE_URL}/internal`,
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const systemAdminService = {
  async login(
    credentials: SystemAdminLoginRequest,
  ): Promise<SystemAdminLoginResponse> {
    const { data } = await sysAdminClient.post<SystemAdminLoginResponse>(
      "/sys-login",
      credentials,
    );
    return data;
  },

  async me(): Promise<SystemAdminMeResponse> {
    const { data } = await sysAdminClient.get<SystemAdminMeResponse>("/me");
    return data;
  },

  async logout(): Promise<void> {
    await sysAdminClient.post("/sys-logout");
  },

  async getDashboard(): Promise<SystemAdminDashboardResponse> {
    const { data } =
      await sysAdminClient.get<SystemAdminDashboardResponse>(
        "/system-dashboard",
      );
    return data;
  },

  async getTenants(params?: TenantListParams): Promise<TenantListResponse> {
    const { data } = await sysAdminClient.get<TenantListResponse>("/tenants", { params });
    return data;
  },

  async getTenantDetail(id: string): Promise<TenantDetailResponse> {
    const { data } = await sysAdminClient.get<TenantDetailResponse>(`/tenants/${id}`);
    return data;
  },

  // ── Coupon management ────────────────────────────────────────────────────

  async createCoupon(payload: CreateCouponRequest): Promise<CouponDetailResponse> {
    const { data } = await sysAdminClient.post<CouponDetailResponse>("/coupons", payload);
    return data;
  },

  async getCoupons(params?: CouponListParams): Promise<CouponListResponse> {
    const { data } = await sysAdminClient.get<CouponListResponse>("/coupons", { params });
    return data;
  },

  async setCouponStatus(id: string, isActive: boolean): Promise<CouponDetailResponse> {
    const { data } = await sysAdminClient.patch<CouponDetailResponse>(`/coupons/${id}/status`, {
      is_active: isActive,
    });
    return data;
  },

  // ── Subscription management ───────────────────────────────────────────────

  async getSubscriptions(params?: SubscriptionListParams): Promise<SubscriptionListResponse> {
    const { data } = await sysAdminClient.get<SubscriptionListResponse>("/subscriptions", { params });
    return data;
  },

  async getTenantSubscription(tenantId: string): Promise<SubscriptionDetailResponse> {
    const { data } = await sysAdminClient.get<SubscriptionDetailResponse>(
      `/tenants/${tenantId}/subscription`,
    );
    return data;
  },
};
