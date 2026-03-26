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
