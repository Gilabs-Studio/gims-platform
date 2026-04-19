/**
 * Helper utilities for handling finance-related API errors.
 * Particularly useful for detecting and displaying COA validation errors.
 */

export type ApiErrorType = 
  | "coa_validation"
  | "mapping_missing"
  | "already_posted"
  | "locked_entry"
  | "missing_setting"
  | "insufficient_balance"
  | "duplicate_journal"
  | "invalid_amount"
  | "unauthorized"
  | "not_found"
  | "internal_error"
  | "unknown";

export interface ParsedApiError {
  type: ApiErrorType;
  message: string;
  missingSettings?: string[];
  details?: Record<string, unknown>;
}

/**
 * Parses an API error response and categorizes it.
 * Returns parsed error information suitable for user display.
 */
export function parseApiError(error: unknown): ParsedApiError {
  // Handle axios-style errors
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
          error?: { code?: string; message?: string };
          details?: Record<string, unknown>;
        };
      };
    };
    const data = axiosError.response?.data;

    const code = data?.error?.code;
    if (typeof code === "string") {
      const normalizedCode = code.toUpperCase();
      if (normalizedCode.includes("MAPPING") || normalizedCode.includes("ACCOUNT")) {
        return {
          type: "mapping_missing",
          message: data?.error?.message ?? data?.message ?? "Account mapping is not configured",
          details: data?.details,
        };
      }

      if (normalizedCode.includes("ALREADY_POSTED")) {
        return {
          type: "already_posted",
          message: data?.error?.message ?? data?.message ?? "Journal has already been posted",
          details: data?.details,
        };
      }

      if (normalizedCode.includes("LOCK") || normalizedCode.includes("IMMUTABLE")) {
        return {
          type: "locked_entry",
          message: data?.error?.message ?? data?.message ?? "Journal entry is locked",
          details: data?.details,
        };
      }
    }
    
    const message = data?.message ?? data?.error?.message;
    if (message) {
      return categorizeError(message, data?.details ?? data);
    }
  }

  // Handle plain error objects or strings
  if (error instanceof Error) {
    return categorizeError(error.message, error);
  }

  if (typeof error === "string") {
    return categorizeError(error);
  }

  return {
    type: "unknown",
    message: "An unexpected error occurred",
  };
}

/**
 * Categorizes error messages and extracts relevant information.
 */
function categorizeError(message: string, details?: unknown): ParsedApiError {
  const msg = String(message).toLowerCase();

  if (msg.includes("mapping") || msg.includes("account mapping")) {
    return {
      type: "mapping_missing",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  if (msg.includes("already posted")) {
    return {
      type: "already_posted",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  if (msg.includes("locked") || msg.includes("immutable") || msg.includes("system-generated")) {
    return {
      type: "locked_entry",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Check for COA validation errors
  if (msg.includes("coa") || msg.includes("chart of account") || msg.includes("accounting")) {
    if (msg.includes("missing") || msg.includes("required") || msg.includes("not found")) {
      const missingSettings = extractMissingSettings(String(message));
      return {
        type: "coa_validation",
        message: String(message),
        missingSettings,
        details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
      };
    }
  }

  // Check for validation errors
  if (msg.includes("validation") || msg.includes("invalid")) {
    return {
      type: "invalid_amount",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Check for balance errors
  if (msg.includes("insufficient") || msg.includes("budget") || msg.includes("balance")) {
    return {
      type: "insufficient_balance",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Check for duplicate/idempotency errors
  if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("already posted")) {
    return {
      type: "duplicate_journal",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Check for authorization errors
  if (msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("permission")) {
    return {
      type: "unauthorized",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Check for not found errors
  if (msg.includes("not found") || msg.includes("does not exist")) {
    return {
      type: "not_found",
      message: String(message),
      details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
    };
  }

  // Default to internal error
  return {
    type: "internal_error",
    message: String(message),
    details: details && typeof details === "object" ? (details as Record<string, unknown>) : undefined,
  };
}

/**
 * Extracts missing COA setting keys from error message.
 * Example: "missing required COA settings: coa.inventory_asset, coa.cogs"
 * Returns: ["coa.inventory_asset", "coa.cogs"]
 */
function extractMissingSettings(message: string): string[] {
  const match = message.match(/missing required COA settings:\s*([^.]+(?:\.[^,]+)*(?:,\s*[^.]+(?:\.[^,]+)*)*)/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Determines if an error is a COA validation error.
 */
export function isCOAValidationError(error: unknown): boolean {
  const parsed = parseApiError(error);
  return parsed.type === "coa_validation";
}

/**
 * Gets a user-friendly error message based on error type.
 */
export function getErrorMessage(error: ParsedApiError, t?: (key: string) => string): string {
  const translate = t || ((k) => k);

  switch (error.type) {
    case "mapping_missing":
      return translate("errors.missing_account_mapping");
    case "coa_validation":
      return translate("errors.missing_coa_settings");
    case "already_posted":
      return translate("errors.already_posted");
    case "locked_entry":
      return translate("errors.locked_entry");
    case "insufficient_balance":
      return translate("errors.insufficient_balance");
    case "duplicate_journal":
      return translate("errors.duplicate_journal");
    case "unauthorized":
      return translate("errors.unauthorized");
    case "not_found":
      return translate("errors.not_found");
    case "invalid_amount":
      return translate("errors.invalid_amount");
    default:
      return error.message;
  }
}
