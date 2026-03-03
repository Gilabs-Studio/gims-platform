import apiClient, { setCSRFTokenMemory } from "@/lib/api-client";
import type { LoginRequest, LoginResponse } from "../types";

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
  async prefetchCSRFToken(): Promise<void> {
    const response = await apiClient.get("/auth/csrf");

    // Use .get() for AxiosHeaders (Axios v1+) with case-insensitive fallback.
    // The response interceptor already sets memoryCsrfToken, but we repeat it
    // here via the static import to guarantee synchronous visibility before
    // this Promise resolves (no additional microtask delay).
    // Use typeof guard before calling .get() — AxiosHeaders.get is a method,
    // but the type union also includes string/number constituents, so the bare
    // optional-chaining call `headers.get?.(...)` produces TS2349.
    const csrfHeader: string | null =
      (typeof response.headers.get === "function"
        ? (response.headers.get("x-csrf-token") as string | null)
        : null) ??
      (response.headers["x-csrf-token"] as string | undefined) ??
      (response.headers["X-CSRF-Token"] as string | undefined) ??
      null;

    if (csrfHeader) {
      setCSRFTokenMemory(csrfHeader);
    }
  },

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      "/auth/login",
      credentials,
    );
    return response.data;
  },

  /**
   * Refresh access token using refresh token cookie.
   * Browser automatically sends HttpOnly refresh_token cookie.
   * Returns user data for session verification.
   */
  async refreshToken(): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/refresh-token");
    return response.data;
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
