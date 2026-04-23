import apiClient, {
  clearCSRFTokenMemory,
  emitAuthTelemetry,
  setCSRFTokenMemory,
} from "@/lib/api-client";
import type { LoginRequest, LoginResponse } from "../types";

export interface SubscriptionPlanConfig {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
  billing_type: "per_user" | "flat";
  price_monthly_idr: number;
  price_yearly_idr: number;
  min_users: number;
  max_users: number;
  is_highlighted: boolean;
  sort_order: number;
  features?: string[];
  module_slugs?: string[];
}

export interface ComputePriceResult {
  plan_slug: string;
  billing_period: string;
  user_count: number;
  base_amount_idr: number;
  discount_amount_idr: number;
  final_amount_idr: number;
  coupon_applied?: boolean;
}

function isCSRFInvalidError(error: unknown): boolean {
  const axiosError = error as {
    response?: { status?: number; data?: { error?: { code?: string } } };
  };

  return (
    axiosError?.response?.status === 403 &&
    axiosError?.response?.data?.error?.code === "CSRF_INVALID"
  );
}

export const authService = {
  /**
   * Prefetch CSRF token from the API.
   *
   * Performs a GET /auth/csrf which causes the backend CSRF middleware to:
   *  1. Generate/reuse the gims_csrf_token cookie (SameSite=None; Secure)
   *  2. Echo the token in the X-CSRF-Token response header
   *
   * The response interceptor in api-client already captures the header into
   * memoryCsrfToken. We mirror it here via the static import to ensure the
   * in-memory value is updated synchronously within the same microtask, with
   * no dynamic-import async boundary that could defer the assignment.
   */
  /**
   * Returns the CSRF token string so callers can inject it explicitly into
   * the immediately-following POST, bypassing the module-level memory cache.
   * This is the only truly reliable approach in cross-origin environments where
   * document.cookie is inaccessible and microtask ordering is non-deterministic.
   */
  async prefetchCSRFToken(): Promise<string | null> {
    const response = await apiClient.get<{
      data: { csrf_token?: string; message?: string };
    }>("/auth/csrf");

    // Primary: read from response body — always accessible regardless of CORS
    // header exposure policies or browser quirks in cross-origin environments.
    // The backend GetCSRFToken handler now echoes the token in the JSON body.
    const bodyToken: string | null =
      response.data?.data?.csrf_token ?? null;

    // Fallback: response header (works in same-origin / when properly exposed)
    const headerToken: string | null =
      (typeof response.headers.get === "function"
        ? (response.headers.get("x-csrf-token") as string | null)
        : null) ??
      (response.headers["x-csrf-token"] as string | undefined) ??
      (response.headers["X-CSRF-Token"] as string | undefined) ??
      null;

    const csrfToken = bodyToken ?? headerToken;

    // Sync the global memory cache so all other interceptor-based requests
    // (PUT, PATCH, DELETE, etc.) also carry the correct token.
    if (csrfToken) {
      setCSRFTokenMemory(csrfToken);
    }

    return csrfToken;
  },

  /**
   * Perform the login POST.
   *
   * @param csrfToken - Token returned by prefetchCSRFToken(). When provided it
   *   is injected directly as a per-request header, guaranteeing the
   *   Double-Submit Cookie pair even if the global memoryCsrfToken cache is
   *   stale or null (cross-origin environments, page reload, etc.).
   */
  async login(
    credentials: LoginRequest,
    csrfToken?: string | null,
  ): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login",
      credentials,
      // Explicit header takes precedence over (and is redundant with) the
      // interceptor, but provides a guaranteed second line of defence.
      csrfToken ? { headers: { "X-CSRF-Token": csrfToken } } : undefined,
    );
    return response.data;
  },

  /**
   * Refresh access token using refresh token cookie.
   * Browser automatically sends HttpOnly refresh_token cookie.
   * Returns user data for session verification.
   */
  async refreshToken(): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>("/auth/refresh-token");
      return response.data;
    } catch (error: unknown) {
      if (!isCSRFInvalidError(error)) {
        throw error;
      }

      emitAuthTelemetry("csrf_invalid_retry", {
        endpoint: "/auth/refresh-token",
        source: "authService.refreshToken",
      });

      clearCSRFTokenMemory();
      const csrfToken = await this.prefetchCSRFToken();

      try {
        const retryResponse = await apiClient.post<LoginResponse>(
          "/auth/refresh-token",
          {},
          csrfToken ? { headers: { "X-CSRF-Token": csrfToken } } : undefined,
        );
        return retryResponse.data;
      } catch (retryError: unknown) {
        emitAuthTelemetry("csrf_retry_failed", {
          endpoint: "/auth/refresh-token",
          source: "authService.refreshToken",
        });
        throw retryError;
      }
    }
  },

  /**
   * Get current authenticated user info.
   * Uses refresh-token endpoint as backend does not have a dedicated /auth/me endpoint.
   * This is the preferred method for checking authentication status.
   *
   * @returns LoginResponse with user data if session is valid
   * @throws Error if session is invalid (401/403, network error, etc.)
   */
  async getMe(): Promise<LoginResponse> {
    return this.refreshToken();
  },

  /**
   * Verify session validity by attempting to refresh the token.
   * This ensures the HttpOnly cookie is present and valid.
   *
   * @returns LoginResponse with user data if session is valid
   * @throws Error if session is invalid (401, network error, etc.)
   * @deprecated Use getMe() instead for clearer semantics
   */
  async verifySession(): Promise<LoginResponse> {
    return this.getMe();
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  /**
   * Self-service tenant registration.
   * - Coupon flow: returns LoginResponse (user is provisioned immediately).
   * - Paid plan flow: returns { invoice_url, invoice_id, expires_at } — caller must
   *   redirect the browser to invoice_url to complete Xendit payment.
   */
  async register(
    payload: {
      name: string;
      email: string;
      password: string;
      company_name?: string;
      coupon?: string;
      plan?: string;
      billing_period?: string;
      user_count?: number;
    },
    csrfToken?: string | null,
  ): Promise<{ success: boolean; data: unknown }> {
    const response = await apiClient.post(
      "/auth/register",
      payload,
      csrfToken ? { headers: { "X-CSRF-Token": csrfToken } } : undefined,
    );
    return response.data;
  },

  /**
   * Validates a coupon code without consuming it.
   * Used by the registration form to preview coupon details before submission.
   */
  async validateCoupon(
    code: string,
    email?: string,
  ): Promise<{
    data?: {
      valid: boolean;
      reason?: string;
      coupon_type?: string;
      discount_type?: string;
      discount_value?: number;
      duration_days?: number;
      description?: string;
      scope?: string;
      target_plan_slug?: string;
    };
  }> {
    let url = `/auth/coupons/validate?code=${encodeURIComponent(code.toUpperCase())}`;
    if (email) {
      url += `&email=${encodeURIComponent(email)}`;
    }
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Returns all active subscription plan configs for the registration form.
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlanConfig[]> {
    const response = await apiClient.get("/auth/plans");
    return response.data?.data ?? [];
  },

  /**
   * Computes the final invoice amount for a plan + billing + user count, optionally
   * applying a coupon discount.
   */
  async computePrice(params: {
    plan_slug: string;
    billing_period: "monthly" | "yearly";
    user_count: number;
    coupon_code?: string;
  }): Promise<ComputePriceResult> {
    const response = await apiClient.post("/auth/plans/compute-price", params);
    return response.data?.data;
  },
};
