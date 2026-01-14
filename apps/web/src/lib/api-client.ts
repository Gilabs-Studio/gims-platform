import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { formatError } from "./i18n/error-messages";
import { useRateLimitStore } from "./stores/useRateLimitStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Flag to track if we've validated rate limit state after app load
let rateLimitValidated = false;

/**
 * Get CSRF token from cookie.
 * The csrf_token cookie is set by the API and is readable by JavaScript.
 */
function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
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

const processQueue = (
  error: AxiosError | null,
  _token: string | null = null,
) => {
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
    // Clear rate limit reset time on successful response
    const status = response.status;
    if (status !== 429) {
      const currentResetTime = useRateLimitStore.getState().resetTime;
      if (currentResetTime) {
        useRateLimitStore.getState().clearResetTime();
        rateLimitValidated = true;
      }
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    // Network error
    if (!error.response) {
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
      };
      const requestUrl = originalRequest?.url || "";

      // Skip token refresh for authentication endpoints
      if (
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/refresh")
      ) {
        return Promise.reject(error);
      }

      // Skip refresh if this is already a retry
      if (originalRequest?._retry) {
        // Refresh failed, logout user
        if (typeof window !== "undefined") {
          const msg = formatError("backend", "unauthorized");
          toast.error(msg.title, { description: msg.description });
          import("@/features/auth/stores/use-auth-store").then(({ useAuthStore }) => {
            useAuthStore.getState().setUser(null);
          });
          setTimeout(() => {
            window.location.href = "/";
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
                permissions: string[];
              };
            };
          }>("/auth/refresh-token", {}, { headers })
          .then((refreshResponse) => {
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
              processQueue(null, null);
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
              import("@/features/auth/stores/use-auth-store").then(({ useAuthStore }) => {
                useAuthStore.getState().setUser(null);
              });
              setTimeout(() => {
                window.location.href = "/";
              }, 1000);
            }
            processQueue(refreshError as AxiosError, null);
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
