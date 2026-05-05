type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorPayload = {
  code?: string;
  error?: {
    code?: string;
    message?: string;
    details?: {
      message?: string;
      [key: string]: unknown;
    };
    field_errors?: ApiFieldError[];
  };
  message?: string;
};

const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_POSTED: "This transaction has already been posted.",
  CONCURRENT_LOCK_CONFLICT: "Opening balance must be posted before fiscal year can be locked.",
  INSUFFICIENT_BALANCE: "The available balance is not sufficient for this action.",
  INVALID_AMOUNT: "Please enter a valid amount.",
  LOCKED_ENTRY: "This record is locked and can no longer be changed.",
  MAPPING_NOT_CONFIGURED: "Required account mapping is not configured yet.",
  MISSING_SETTING: "Required finance settings are missing.",
  NOT_FOUND: "The requested item could not be found.",
  PERIOD_CLOSED: "The selected period is closed and cannot be changed.",
  RESOURCE_ALREADY_EXISTS: "An item with the same data already exists.",
  UNAUTHORIZED: "You do not have permission to perform this action.",
  VALIDATION_ERROR: "Please review the highlighted fields and try again.",
  ACCOUNT_INACTIVE: "The selected account is inactive.",
  ACCOUNT_NOT_POSTABLE: "The selected account cannot be used for posting.",
};

function toSentenceCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function extractErrorCode(payload: ApiErrorPayload | undefined): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload.code === "string" && payload.code.trim().length > 0) {
    return payload.code.trim().toUpperCase();
  }

  if (payload.error && typeof payload.error.code === "string" && payload.error.code.trim().length > 0) {
    return payload.error.code.trim().toUpperCase();
  }

  return null;
}

function extractBestMessage(payload: ApiErrorPayload | undefined): string | null {
  if (!payload) {
    return null;
  }

  const detailMessage = payload.error?.details?.message;
  if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
    return detailMessage.trim();
  }

  const apiMessage = payload.error?.message;
  if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
    return apiMessage.trim();
  }

  if (typeof payload.message === "string" && payload.message.trim().length > 0) {
    return payload.message.trim();
  }

  return null;
}

export function getFinanceErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const responseData = (
      error as {
        response?: { data?: ApiErrorPayload };
      }
    ).response?.data;

    const errorCode = extractErrorCode(responseData);
    if (errorCode && FRIENDLY_ERROR_MESSAGES[errorCode]) {
      return FRIENDLY_ERROR_MESSAGES[errorCode];
    }

    const fieldErrors = responseData?.error?.field_errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const firstFieldError = fieldErrors[0];
      const field = toSentenceCase(firstFieldError.field ?? "Field");
      const message = firstFieldError.message?.trim();
      if (message) {
        return `${field}: ${message}`;
      }
    }

    const bestMessage = extractBestMessage(responseData);
    if (bestMessage) {
      return bestMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}