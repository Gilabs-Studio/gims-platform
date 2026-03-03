import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponseHeaders,
  InternalAxiosRequestConfig,
  RawAxiosResponseHeaders,
} from "axios";
import { toast } from "sonner";
import { formatError } from "./i18n/error-messages";
import { useRateLimitStore } from "./stores/useRateLimitStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8087";

// Memory cache for CSRF token to support cross-origin API calls
let memoryCsrfToken: string | null = null;

/**
 * Robustly extract CSRF token from an Axios headers object.
 *
 * Axios v1+ uses an AxiosHeaders instance whose internal storage may not be
 * enumerable via `for...in`. The `.get()` method is the canonical API for
 * case-insensitive lookup, so we try it first before falling back to bracket
 * access and the slower `for...in` walk.
 */
function extractCsrfFromHeaders(
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders | null | undefined,
): string | null {
  if (!headers) return null;

  // Primary: AxiosHeaders v1+ case-insensitive .get()
  if (typeof headers.get === "function") {
    const val = headers.get("x-csrf-token");
    if (val) return String(val);
  }

  // Fallback: plain object bracket access (works for both casings)
  if (headers["x-csrf-token"]) return String(headers["x-csrf-token"]);
  if (headers["X-CSRF-Token"]) return String(headers["X-CSRF-Token"]);

  // Last resort: enumerate for any remaining case variant
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key) &&
        key.toLowerCase() === "x-csrf-token") {
      return String(headers[key]);
    }
  }
  return null;
}

/**
 * Get CSRF token from memory or cookie.
 * The csrf_token is exposed by the API via the X-CSRF-Token header.
 */
export function getCSRFToken(): string | null {
  if (memoryCsrfToken) return memoryCsrfToken;
  if (typeof document === "undefined") return null;
  // Fallback to cookie if same-origin scenario
  const match = document.cookie.match(/(?:^|;\s*)gims_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Manually set the CSRF token in memory for cross-origin setups.
 */
export function setCSRFTokenMemory(token: string): void {
  if (token) {
    memoryCsrfToken = token;
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true, // IMPORTANT: Send and receive cookies
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
const failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  const queue = [...failedQueue];
  failedQueue.splice(0, failedQueue.length);
  queue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
};

// Request interceptor for CSRF token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add CSRF token header for unsafe methods (POST, PUT, PATCH, DELETE)
    const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];
    if (config.method && unsafeMethods.includes(config.method.toUpperCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken && config.headers) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

interface ErrorDetails {
  field?: string;
  resource?: string;
  value?: string;
  [key: string]: unknown;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
    field_errors?: Array<{ field: string; message: string }>;
  };
  timestamp: string;
  request_id: string;
}

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Read and cache CSRF token from headers (vital for cross-origin setups)
    const csrfHeader = extractCsrfFromHeaders(response.headers);
    if (csrfHeader) {
      memoryCsrfToken = csrfHeader;
    }

    // Clear rate limit reset time on successful response
    if (response.status !== 429) {
      const currentResetTime = useRateLimitStore.getState().resetTime;
      if (currentResetTime) {
        useRateLimitStore.getState().clearResetTime();
      }
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    // Try to extract CSRF token even from error responses
    if (error.response?.headers) {
      const csrfHeader = extractCsrfFromHeaders(error.response.headers);
      if (csrfHeader) {
        memoryCsrfToken = csrfHeader;
      }
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const requestUrl = originalRequest?.url || "";

    // Skip toast for auth endpoints - these handle their own errors silently
    // 401/403 is expected when checking session or after logout
    const isAuthEndpoint =
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/logout");

    // Network error
    if (!error.response) {
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      if (error.code === "ECONNABORTED") {
        const msg = formatError("network", "timeout");
        toast.error(msg.title, { description: msg.description });
      } else if (
        error.code === "ERR_NETWORK" ||
        error.message === "Network Error"
      ) {
        const msg = formatError("network", "connectionFailed");
        toast.error(msg.title, { description: msg.description });
      } else {
        const msg = formatError("network", "generic");
        toast.error(msg.title, { description: msg.description });
      }
      return Promise.reject(error);
    }

    const status = error.response.status;
    const errorData = error.response.data;

    // Skip toast for auth endpoints on any error except 429 (rate limit).
    // /auth/refresh-token, /auth/login, /auth/logout all handle errors internally.
    // The backend may return 500 for an expired/invalid refresh token (instead of 401),
    // so we must silence ALL non-429 errors from these endpoints to prevent spurious toasts
    // when useLoginGuard probes session validity on the login page.
    if (isAuthEndpoint && status !== 429) {
      return Promise.reject(error);
    }

    if (!errorData || !errorData.error) {
      const msg = formatError("backend", "invalidFormat");
      toast.error(msg.title, { description: msg.description });
      return Promise.reject(error);
    }

    const errorCode = errorData.error.code;
    const errorDetails = errorData.error.details;
    const fieldErrors = errorData.error.field_errors;

    // Handle CSRF errors
    if (errorCode === "CSRF_INVALID") {
      // CSRF token invalid - try to get a new one
      const msg = formatError("backend", "csrfError");
      toast.error(msg.title || "Session expired", {
        description: msg.description || "Please try again.",
      });
      return Promise.reject(error);
    }

    // Handle resource conflicts
    if (errorCode === "RESOURCE_ALREADY_EXISTS" || errorCode === "CONFLICT") {
      if (
        errorDetails?.field === "email" &&
        errorDetails?.resource === "user"
      ) {
        const msg = formatError("backend", "emailExists", {
          email: String(errorDetails.value || ""),
        });
        toast.error(msg.title, { description: msg.description });
      } else if (errorDetails?.field && errorDetails?.resource) {
        const msg = formatError("backend", "resourceExists", {
          field: errorDetails.field,
          value: String(errorDetails.value || ""),
        });
        toast.error(msg.title, { description: msg.description });
      } else {
        const msg = formatError("backend", "conflict");
        toast.error(msg.title, { description: msg.description });
      }
      return Promise.reject(error);
    }

    // Handle internal server error with details
    if (errorCode === "INTERNAL_SERVER_ERROR" && errorDetails) {
      if (errorDetails.field === "email" && errorDetails.resource === "user") {
        const msg = formatError("backend", "emailExists", {
          email: String(errorDetails.value || ""),
        });
        toast.error(msg.title, { description: msg.description });
        return Promise.reject(error);
      }
      if (errorDetails.field && errorDetails.resource) {
        const msg = formatError("backend", "resourceExists", {
          field: errorDetails.field,
          value: String(errorDetails.value || ""),
        });
        toast.error(msg.title, { description: msg.description });
        return Promise.reject(error);
      }
    }

    // Handle validation errors
    if (
      errorCode === "VALIDATION_ERROR" &&
      fieldErrors &&
      fieldErrors.length > 0
    ) {
      const firstError = fieldErrors[0];
      const msg = formatError("backend", "fieldError", {
        field: firstError.field,
        message: firstError.message,
      });
      toast.error(msg.title, { description: msg.description });
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (status === 401) {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
        skipAuthRedirectOn401?: boolean;
      };
      const requestUrl = originalRequest?.url || "";

      // Skip token refresh for authentication endpoints
      if (
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      // When requested (e.g. mutations), only show toast and reject — no refresh, no logout
      if (originalRequest?.skipAuthRedirectOn401) {
        if (typeof window !== "undefined") {
          const msg = formatError("backend", "unauthorized");
          toast.error(msg.title, { description: msg.description });
        }
        return Promise.reject(error);
      }

      // Skip refresh if this is already a retry
      if (originalRequest?._retry) {
        // Refresh failed, logout user
        if (typeof window !== "undefined") {
          const msg = formatError("backend", "unauthorized");
          toast.error(msg.title, { description: msg.description });

          // Clear all auth state and cookies
          import("@/features/auth/stores/use-auth-store").then(({ useAuthStore }) => {
            useAuthStore.getState().logout();
          });
          import("@/features/auth/utils/clear-auth-cookies").then(({ fullAuthCleanup }) => {
            fullAuthCleanup();
          });

          setTimeout(() => {
            // Extract locale from current path (/en/... or /id/...) so we land on the right login
            const segments = window.location.pathname.split("/").filter(Boolean);
            const locale = ["en", "id"].includes(segments[0]) ? segments[0] : "en";
            window.location.href = `/${locale}/login`;
          }, 1000);
        }
        return Promise.reject(error);
      }

      // Try to refresh token using cookies
      if (!isRefreshing) {
        isRefreshing = true;

        // Create separate axios instance for refresh to avoid circular dependency
        const refreshClient = axios.create({
          baseURL: `${API_BASE_URL}/api/v1`,
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
          withCredentials: true,
        });

        // Add CSRF token for refresh request
        const csrfToken = getCSRFToken();
        const headers: Record<string, string> = {};
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        return refreshClient
          .post<{
            success: boolean;
            data?: {
              user: {
                id: string;
                email: string;
                name: string;
                avatar_url: string;
                role: { code: string; name: string };
                permissions: Record<string, string>;
              };
            };
          }>("/auth/refresh-token", {}, { headers })
          .then((refreshResponse) => {
            // Read and cache CSRF token from headers even during refresh
            const refreshCsrfHeader = extractCsrfFromHeaders(refreshResponse.headers);
            if (refreshCsrfHeader) {
              memoryCsrfToken = refreshCsrfHeader;
            }

            const response = refreshResponse.data;
            if (response.success && response.data) {
              // Update auth store with new user data
              import("@/features/auth/stores/use-auth-store").then(
                ({ useAuthStore }) => {
                  useAuthStore.getState().setUser(response.data?.user ?? null);
                  useAuthStore.setState({ isAuthenticated: true });
                },
              );

              originalRequest._retry = true;
              processQueue(null);
              isRefreshing = false;

              // Retry original request
              return apiClient(originalRequest);
            } else {
              throw new Error("Refresh token failed");
            }
          })
          .catch((refreshError) => {
            isRefreshing = false;
            if (typeof window !== "undefined") {
              const msg = formatError("backend", "unauthorized");
              toast.error(msg.title, { description: msg.description });

              // Clear all auth state and cookies
              import("@/features/auth/stores/use-auth-store").then(({ useAuthStore }) => {
                useAuthStore.getState().logout();
              });
              import("@/features/auth/utils/clear-auth-cookies").then(({ fullAuthCleanup }) => {
                fullAuthCleanup();
              });

              setTimeout(() => {
                // Extract locale from current path (/en/... or /id/...) so we land on the right login
                const segments = window.location.pathname.split("/").filter(Boolean);
                const locale = ["en", "id"].includes(segments[0]) ? segments[0] : "en";
                window.location.href = `/${locale}/login`;
              }, 1000);
            }
            processQueue(refreshError as AxiosError);
            return Promise.reject(refreshError);
          });
      } else {
        // Already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest._retry = true;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }
    } else if (status === 403) {
      const msg = formatError("backend", "forbidden");
      toast.error(msg.title, { description: msg.description });
    } else if (status === 404) {
      const isMutation =
        error.config?.method &&
        ["post", "put", "patch", "delete"].includes(
          error.config.method.toLowerCase(),
        );
      if (isMutation) {
        const msg = formatError("backend", "notFound");
        toast.error(msg.title, { description: msg.description });
      }
    } else if (status === 409) {
      const msg = formatError("backend", "conflict");
      toast.error(msg.title, { description: msg.description });
    } else if (status === 422) {
      // 422 Unprocessable Entity — business rule violation (e.g. WAREHOUSE_HAS_STOCK).
      // Suppress the global toast so each caller can render its own contextual UI.
      return Promise.reject(error);
    } else if (status === 503) {
      const msg = formatError("backend", "serviceUnavailable");
      toast.error(msg.title, { description: msg.description });
    } else if (status === 429) {
      // Rate limit handling
      const headers = error.response?.headers || {};
      const resetHeader =
        headers["x-ratelimit-reset"] || headers["X-RateLimit-Reset"];

      if (resetHeader) {
        const resetTimeValue =
          typeof resetHeader === "string"
            ? parseInt(resetHeader, 10)
            : typeof resetHeader === "number"
              ? resetHeader
              : null;

        if (
          resetTimeValue !== null &&
          !isNaN(resetTimeValue) &&
          resetTimeValue > 0
        ) {
          useRateLimitStore.getState().setResetTime(resetTimeValue);
        }
      }

      const rateLimitMessage =
        errorData?.error?.message ||
        "Too many login attempts. Please wait before trying again.";

      const customError = { ...error } as AxiosError<ApiErrorResponse>;
      customError.message = rateLimitMessage;

      if (customError.response?.data) {
        if (!customError.response.data.error) {
          customError.response.data.error = {
            code: "RATE_LIMIT_EXCEEDED",
            message: rateLimitMessage,
          };
        } else {
          customError.response.data.error.message = rateLimitMessage;
        }
      }

      // Show toast with countdown
      const countdown = useRateLimitStore.getState().getCountdownText();
      const msg = formatError("backend", "rateLimit", { countdown });
      toast.error(msg.title, { description: msg.description });

      return Promise.reject(customError);
    } else if (status >= 500) {
      const msg = formatError("backend", "serverError");
      toast.error(msg.title, { description: msg.description });
    } else {
      const requestUrl = error.config?.url || "";
      if (!requestUrl.includes("/auth/login")) {
        const msg = formatError("backend", "unexpectedError");
        toast.error(msg.title, { description: msg.description });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
