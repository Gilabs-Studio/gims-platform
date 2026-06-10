import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  getCSRFToken,
  setCSRFTokenMemory,
  clearCSRFTokenMemory,
  emitAuthTelemetry,
} from "@/lib/api-client";
import type {
  SystemAdminLoginRequest,
  SystemAdminLoginResponse,
  SystemAdminMeResponse,
  SystemAdminUpdateProfileRequest,
  SystemAdminUpdateProfileResponse,
  SystemAdminChangePasswordRequest,
  SystemAdminChangePasswordResponse,
  SystemAdminDashboardResponse,
  TenantListResponse,
  TenantDetailResponse,
  TenantListParams,
  CouponListResponse,
  CouponDetailResponse,
  CouponListParams,
  CreateCouponRequest,
  UpdateCouponRequest,
  SubscriptionListResponse,
  SubscriptionDetailResponse,
  SubscriptionListParams,
  PlanListResponse,
  PlanDetailResponse,
  UpsertPlanRequest,
  PermissionListResponse,
  PermissionDetailResponse,
  PermissionMenuOptionResponse,
  PermissionListParams,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  SupportFeedbackListResponse,
  SalesReferralListParams,
  SalesReferralStatsParams,
  SalesReferralStatsResponse,
  SalesReferralAccountListResponse,
  SalesReferralAccountDetailResponse,
  SalesReferralCodeListResponse,
  SalesReferralCodeDetailResponse,
  CreateSalesReferralAccountRequest,
  UpdateSalesReferralAccountRequest,
  CreateSalesReferralCodeRequest,
  UpdateSalesReferralCodeRequest,
} from "../types";

const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087"
    : "";

const SYS_ADMIN_CSRF_BOOTSTRAP_COOLDOWN_MS = 2000;

let sysAdminCSRFBootstrapPromise: Promise<string | null> | null = null;
let sysAdminCSRFBootstrapCooldownUntil = 0;

const sysAdminCSRFClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

function extractCSRFHeader(headers: unknown): string | null {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const candidate = headers as {
    get?: (name: string) => unknown;
    [key: string]: unknown;
  };

  if (typeof candidate.get === "function") {
    const value = candidate.get("x-csrf-token");
    if (value) {
      return String(value);
    }
  }

  const directLower = candidate["x-csrf-token"];
  if (directLower) {
    return String(directLower);
  }

  const directCanonical = candidate["X-CSRF-Token"];
  if (directCanonical) {
    return String(directCanonical);
  }

  for (const [key, value] of Object.entries(candidate)) {
    if (key.toLowerCase() === "x-csrf-token" && value) {
      return String(value);
    }
  }

  return null;
}

function isUnsafeMethod(method?: string): boolean {
  if (!method) return false;
  const normalized = method.toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

async function ensureSystemAdminCSRFToken(options?: { forceRefresh?: boolean }): Promise<string | null> {
  if (options?.forceRefresh) {
    clearCSRFTokenMemory();
  }

  const existing = getCSRFToken();
  if (existing) {
    return existing;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (Date.now() < sysAdminCSRFBootstrapCooldownUntil) {
    return null;
  }

  if (sysAdminCSRFBootstrapPromise) {
    return sysAdminCSRFBootstrapPromise;
  }

  sysAdminCSRFBootstrapPromise = sysAdminCSRFClient
    .get<{ data?: { csrf_token?: string } }>("/auth/csrf")
    .then((response) => {
      const fromBody = response.data?.data?.csrf_token ?? null;
      const fromHeader = extractCSRFHeader(response.headers);
      const token = fromBody ?? fromHeader;

      if (token) {
        setCSRFTokenMemory(token);
        sysAdminCSRFBootstrapCooldownUntil = 0;
      }

      return token;
    })
    .catch((error: unknown) => {
      sysAdminCSRFBootstrapCooldownUntil = Date.now() + SYS_ADMIN_CSRF_BOOTSTRAP_COOLDOWN_MS;
      emitAuthTelemetry("csrf_bootstrap_failed", {
        source: "system-admin-client",
        message: error instanceof Error ? error.message : "bootstrap_failed",
      });
      return null;
    })
    .finally(() => {
      sysAdminCSRFBootstrapPromise = null;
    });

  return sysAdminCSRFBootstrapPromise;
}

// Separate axios instance for system admin API calls (/internal/*)
const sysAdminClient = axios.create({
  baseURL: `${API_BASE_URL}/internal`,
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

sysAdminClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isUnsafeMethod(config.method)) {
    let token = getCSRFToken();
    if (!token) {
      token = await ensureSystemAdminCSRFToken();
    }
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["X-CSRF-Token"] = token;
    }
  }
  return config;
});

sysAdminClient.interceptors.response.use(
  (response) => {
    const token = extractCSRFHeader(response.headers);
    if (token) {
      setCSRFTokenMemory(token);
    }
    return response;
  },
  async (error: AxiosError<{ error?: { code?: string } }>) => {
    const headerToken = extractCSRFHeader(error.response?.headers);
    if (headerToken) {
      setCSRFTokenMemory(headerToken);
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _csrfRetried?: boolean }) | undefined;
    const isCSRFInvalid = error.response?.status === 403 && error.response?.data?.error?.code === "CSRF_INVALID";

    if (isCSRFInvalid && originalRequest && !originalRequest._csrfRetried && isUnsafeMethod(originalRequest.method)) {
      originalRequest._csrfRetried = true;
      const nextToken = await ensureSystemAdminCSRFToken({ forceRefresh: true });
      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers["X-CSRF-Token"] = nextToken;
      }
      return sysAdminClient.request(originalRequest);
    }

    return Promise.reject(error);
  },
);

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

  async updateProfile(
    payload: SystemAdminUpdateProfileRequest,
  ): Promise<SystemAdminUpdateProfileResponse> {
    const { data } = await sysAdminClient.patch<SystemAdminUpdateProfileResponse>(
      "/me",
      payload,
    );
    return data;
  },

  async changePassword(
    payload: SystemAdminChangePasswordRequest,
  ): Promise<SystemAdminChangePasswordResponse> {
    const { data } = await sysAdminClient.patch<SystemAdminChangePasswordResponse>(
      "/me/password",
      payload,
    );
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

  async recoverTenantDeletion(id: string): Promise<TenantDetailResponse> {
    const { data } = await sysAdminClient.post<TenantDetailResponse>(`/tenants/${id}/recover-deletion`);
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

  async updateCoupon(id: string, payload: UpdateCouponRequest): Promise<CouponDetailResponse> {
    const { data } = await sysAdminClient.put<CouponDetailResponse>(`/coupons/${id}`, payload);
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

  // ── Subscription plan management ──────────────────────────────────────────

  async listPlans(params?: { page?: number; per_page?: number }): Promise<PlanListResponse> {
    const { data } = await sysAdminClient.get<PlanListResponse>("/plans", { params });
    return data;
  },

  async upsertPlan(payload: UpsertPlanRequest): Promise<PlanDetailResponse> {
    const { data } = await sysAdminClient.put<PlanDetailResponse>("/plans", payload);
    return data;
  },

  async setPlanActive(slug: string, isActive: boolean): Promise<PlanDetailResponse> {
    const { data } = await sysAdminClient.patch<PlanDetailResponse>(`/plans/${slug}/status`, {
      is_active: isActive,
    });
    return data;
  },

  async syncPlanEntitlements(slug: string, menuURLs: string[]): Promise<PlanDetailResponse> {
    const { data } = await sysAdminClient.put<PlanDetailResponse>(`/plans/${slug}/entitlements`, {
      menu_urls: menuURLs,
    });
    return data;
  },

  // ── Permission management ─────────────────────────────────────────────────

  async listPermissions(params?: PermissionListParams): Promise<PermissionListResponse> {
    const { data } = await sysAdminClient.get<PermissionListResponse>("/permissions", { params });
    return data;
  },

  async getPermission(id: string): Promise<PermissionDetailResponse> {
    const { data } = await sysAdminClient.get<PermissionDetailResponse>(`/permissions/${id}`);
    return data;
  },

  async listPermissionMenus(): Promise<PermissionMenuOptionResponse> {
    const { data } = await sysAdminClient.get<PermissionMenuOptionResponse>("/permissions/menus");
    return data;
  },

  async createPermission(payload: CreatePermissionRequest): Promise<PermissionDetailResponse> {
    const { data } = await sysAdminClient.post<PermissionDetailResponse>("/permissions", payload);
    return data;
  },

  async updatePermission(id: string, payload: UpdatePermissionRequest): Promise<PermissionDetailResponse> {
    const { data } = await sysAdminClient.put<PermissionDetailResponse>(`/permissions/${id}`, payload);
    return data;
  },

  async deletePermission(id: string): Promise<{ success: boolean }> {
    const { data } = await sysAdminClient.delete<{ success: boolean }>(`/permissions/${id}`);
    return data;
  },


  // ── Support Feedback Management ──────────────────────────────────────────

  async getFeedbacks(params?: { page?: number; per_page?: number }): Promise<SupportFeedbackListResponse> {
    const { data } = await sysAdminClient.get<SupportFeedbackListResponse>("/support-feedbacks", { params });
    return data;
  },

  async deleteFeedback(id: string): Promise<{ success: boolean }> {
    const { data } = await sysAdminClient.delete<{ success: boolean }>(`/support-feedbacks/${id}`);
    return data;
  },

  // ── Sales Referral Management ────────────────────────────────────────────

  async getReferralStats(params?: SalesReferralStatsParams): Promise<SalesReferralStatsResponse> {
    const { data } = await sysAdminClient.get<SalesReferralStatsResponse>("/referrals/stats", { params });
    return data;
  },

  async listReferralAccounts(params?: SalesReferralListParams): Promise<SalesReferralAccountListResponse> {
    const { data } = await sysAdminClient.get<SalesReferralAccountListResponse>("/referrals/accounts", { params });
    return data;
  },

  async createReferralAccount(payload: CreateSalesReferralAccountRequest): Promise<SalesReferralAccountDetailResponse> {
    const { data } = await sysAdminClient.post<SalesReferralAccountDetailResponse>("/referrals/accounts", payload);
    return data;
  },

  async updateReferralAccount(id: string, payload: UpdateSalesReferralAccountRequest): Promise<SalesReferralAccountDetailResponse> {
    const { data } = await sysAdminClient.put<SalesReferralAccountDetailResponse>(`/referrals/accounts/${id}`, payload);
    return data;
  },

  async deleteReferralAccount(id: string): Promise<{ success: boolean }> {
    const { data } = await sysAdminClient.delete<{ success: boolean }>(`/referrals/accounts/${id}`);
    return data;
  },

  async listReferralCodes(params?: SalesReferralListParams): Promise<SalesReferralCodeListResponse> {
    const { data } = await sysAdminClient.get<SalesReferralCodeListResponse>("/referrals/codes", { params });
    return data;
  },

  async createReferralCode(payload: CreateSalesReferralCodeRequest): Promise<SalesReferralCodeDetailResponse> {
    const { data } = await sysAdminClient.post<SalesReferralCodeDetailResponse>("/referrals/codes", payload);
    return data;
  },

  async updateReferralCode(id: string, payload: UpdateSalesReferralCodeRequest): Promise<SalesReferralCodeDetailResponse> {
    const { data } = await sysAdminClient.put<SalesReferralCodeDetailResponse>(`/referrals/codes/${id}`, payload);
    return data;
  },

  async setReferralCodeStatus(id: string, isActive: boolean): Promise<{ success: boolean }> {
    const { data } = await sysAdminClient.patch<{ success: boolean }>(`/referrals/codes/${id}/status`, {
      is_active: isActive,
    });
    return data;
  },

  async deleteReferralCode(id: string): Promise<{ success: boolean }> {
    const { data } = await sysAdminClient.delete<{ success: boolean }>(`/referrals/codes/${id}`);
    return data;
  },
};
