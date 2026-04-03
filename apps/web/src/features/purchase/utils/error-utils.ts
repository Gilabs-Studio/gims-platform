type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: {
      message?: string;
      [key: string]: unknown;
    };
    field_errors?: ApiFieldError[];
  };
  message?: string;
};

function toSentenceCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function getPurchaseErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const responseData = (
      error as {
        response?: { data?: ApiErrorPayload };
      }
    ).response?.data;

    // Check for specific error codes from backend
    const errorCode = (responseData?.error as Record<string, unknown>)?.code;
    if (typeof errorCode === "string" && errorCode) {
      const knownErrors: Record<string, string> = {
        QUANTITY_EXCEEDS_ORDER: "Received quantity exceeds the purchase order quantity.",
        DUPLICATE_JOURNAL: "A journal entry already exists for this transaction.",
        OVERPAYMENT: "Payment amount exceeds the remaining invoice balance.",
        PERIOD_CLOSED: "Cannot modify transactions in a closed financial period.",
        INVALID_STATUS_TRANSITION: "This status change is not allowed.",
        THREE_WAY_MATCH_FAILED: "3-way matching failed. Price/quantity mismatch between PO, GR, and Invoice.",
      };
      if (knownErrors[errorCode]) {
        const apiDetail = responseData?.error?.details?.message;
        return typeof apiDetail === "string" && apiDetail.trim().length > 0
          ? apiDetail
          : knownErrors[errorCode];
      }
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

    const detailMessage = responseData?.error?.details?.message;
    if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
      return detailMessage;
    }

    const apiMessage = responseData?.error?.message;
    if (typeof apiMessage === "string" && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    const genericMessage = responseData?.message;
    if (typeof genericMessage === "string" && genericMessage.trim().length > 0) {
      return genericMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
