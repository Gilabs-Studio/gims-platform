import apiClient from "@/lib/api-client";
import type { LoginRequest, LoginResponse, MenusResponse } from "../types";

export const authService = {
  /**
   * Prefetch CSRF token from the API.
   * This sets the csrf_token cookie for use in subsequent requests.
   */
  async prefetchCSRFToken(): Promise<void> {
    await apiClient.get("/auth/csrf");
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
   * Verify session validity by attempting to refresh the token.
   * This ensures the HttpOnly cookie is present and valid.
   *
   * @returns LoginResponse with user data if session is valid
   * @throws Error if session is invalid (401, network error, etc.)
   */
  async verifySession(): Promise<LoginResponse> {
    return this.refreshToken();
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },
};
