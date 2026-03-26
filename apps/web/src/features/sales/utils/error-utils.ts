type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
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

export function toOptionalString(value?: string | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getSalesErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const responseData = (
      error as {
        response?: { data?: ApiErrorPayload };
      }
    ).response?.data;

    const fieldErrors = responseData?.error?.field_errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const firstFieldError = fieldErrors[0];
      const rawField = firstFieldError.field ?? "Field";
      const field = toSentenceCase(rawField);
      const message = firstFieldError.message?.trim();
      if (message) {
        if (
          /customer/i.test(rawField) &&
          /invalid\s+uuid/i.test(message)
        ) {
          return "Customer is required. Please select a valid customer.";
        }
        return `${field}: ${message}`;
      }
    }

    const detailMessage = responseData?.error?.details?.message;
    if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
      return detailMessage;
    }

    const apiErrorMessage = responseData?.error?.message;
    if (typeof apiErrorMessage === "string" && apiErrorMessage.trim().length > 0) {
      return apiErrorMessage;
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

export function getFirstFormErrorMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") {
    return undefined;
  }

  if (Array.isArray(errors)) {
    for (const item of errors) {
      const nestedMessage = getFirstFormErrorMessage(item);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
    return undefined;
  }

  if ("message" in errors) {
    const message = (errors as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  for (const value of Object.values(errors)) {
    const nestedMessage = getFirstFormErrorMessage(value);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return undefined;
}
