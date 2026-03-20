import apiClient, {
  clearCSRFTokenMemory,
  emitAuthTelemetry,
  setCSRFTokenMemory,
} from "@/lib/api-client";
import type { LoginRequest, LoginResponse } from "../types";

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
};
