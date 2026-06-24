import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

type ApiFieldError = {
  field?: string;
  message?: string;
};

type ApiErrorPayload = {
  code?: string;
  details?: {
    message?: string;
    [key: string]: unknown;
  };
  error?: string | {
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

function toSentenceCase(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function normalizePurchaseFieldPath(input: string): string {
  return input.replace(/\[(\d+)\]/g, ".$1").replace(/^\.+|\.+$/g, "");
}

function wildcardPurchaseFieldPath(input: string): string {
  return normalizePurchaseFieldPath(input).replace(/\.\d+(?=\.|$)/g, ".*");
}

function defaultPurchaseFieldLabel(input: string): string {
  const wildcardPath = wildcardPurchaseFieldPath(input);
  const knownLabels: Record<string, string> = {
    supplier_id: "Supplier",
    supplier_contact_id: "Supplier contact",
    payment_terms_id: "Payment terms",
    business_unit_id: "Business unit",
    employee_id: "Requested by",
    request_date: "Request date",
    order_date: "Order date",
    purchase_requisitions_id: "Purchase requisition",
    sales_order_id: "Sales order",
    "items.*.product_id": "Item product",
    "items.*.quantity": "Item quantity",
    "items.*.purchase_price": "Item purchase price",
    "items.*.price": "Item price",
  };

  if (knownLabels[wildcardPath]) {
    return knownLabels[wildcardPath];
  }

  const segments = normalizePurchaseFieldPath(input)
    .split(".")
    .filter((segment) => segment.length > 0 && !/^\d+$/.test(segment));

  return toSentenceCase(segments.join(" "));
}

function normalizePurchaseFieldMessage(message: string | undefined, fallbackRequired: string): string {
  const trimmed = message?.trim();
  if (!trimmed) {
    return fallbackRequired;
  }

  if (/required/i.test(trimmed) || /match pattern/i.test(trimmed)) {
    return fallbackRequired;
  }

  return trimmed;
}

export function extractPurchaseFieldErrors(error: unknown): ApiFieldError[] {
  if (!(error && typeof error === "object" && "response" in error)) {
    return [];
  }

  const responseData = (
    error as {
      response?: { data?: ApiErrorPayload };
    }
  ).response?.data;
  const nestedError = typeof responseData?.error === "object" ? responseData.error : undefined;

  const fieldErrors = nestedError?.field_errors;
  if (Array.isArray(fieldErrors)) {
    return fieldErrors;
  }

  const detailField = nestedError?.details?.field ?? responseData?.details?.field;
  const detailMessage = nestedError?.details?.message ?? responseData?.details?.message;
  if (typeof detailField === "string" && detailField.trim().length > 0) {
    return [{
      field: detailField,
      message: typeof detailMessage === "string" ? detailMessage : undefined,
    }];
  }

  return [];
}

export function getPurchaseFieldLabel(
  input: string,
  fieldLabels?: Record<string, string>,
): string {
  const normalizedPath = normalizePurchaseFieldPath(input);
  const wildcardPath = wildcardPurchaseFieldPath(input);

  return (
    fieldLabels?.[normalizedPath] ??
    fieldLabels?.[wildcardPath] ??
    defaultPurchaseFieldLabel(input)
  );
}

export function applyPurchaseFormErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  fieldLabels?: Record<string, string>,
  fallbackRequired = "Required",
): boolean {
  const fieldErrors = extractPurchaseFieldErrors(error);
  if (fieldErrors.length === 0) {
    return false;
  }

  for (const fieldError of fieldErrors) {
    const field = fieldError.field?.trim();
    if (!field) {
      continue;
    }

    setError(normalizePurchaseFieldPath(field) as FieldPath<TFieldValues>, {
      type: "server",
      message: normalizePurchaseFieldMessage(fieldError.message, fallbackRequired),
    });
  }

  return true;
}

export function getPurchaseErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const responseData = (
      error as {
        response?: { data?: ApiErrorPayload };
      }
    ).response?.data;
    const nestedError = typeof responseData?.error === "object" ? responseData.error : undefined;
    const topLevelError = typeof responseData?.error === "string" ? responseData.error : undefined;
    const topLevelDetails = responseData?.details;

    // Check for specific error codes from backend
    const errorCode = nestedError?.code ?? responseData?.code;
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
        const apiDetail = topLevelError ?? nestedError?.details?.message ?? topLevelDetails?.message;
        return typeof apiDetail === "string" && apiDetail.trim().length > 0
          ? apiDetail
          : knownErrors[errorCode];
      }
    }

    const fieldErrors = nestedError?.field_errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const firstFieldError = fieldErrors[0];
      const field = getPurchaseFieldLabel(firstFieldError.field ?? "Field");
      const message = normalizePurchaseFieldMessage(firstFieldError.message, "Required");
      if (message) {
        return `${field}: ${message}`;
      }
    }

    const detailMessage = nestedError?.details?.message ?? topLevelDetails?.message;
    if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
      return detailMessage;
    }

    const apiMessage = nestedError?.message ?? topLevelError;
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

export function isAccountingMappingError(error: unknown): boolean {
  if (!(error && typeof error === "object" && "response" in error)) {
    return false;
  }

  const responseData = (
    error as {
      response?: { data?: ApiErrorPayload };
    }
  ).response?.data;

  const nestedError = typeof responseData?.error === "object" ? responseData.error : undefined;
  const errorCode = (nestedError?.code ?? responseData?.code)?.toUpperCase();
  if (errorCode) {
    const mappingCodes = ["MAPPING", "COA", "ACCOUNT", "SETTING"];
    if (mappingCodes.some((code) => errorCode.includes(code))) {
      return true;
    }
  }

  const messages = [
    nestedError?.message,
    nestedError?.details?.message,
    typeof responseData?.error === "string" ? responseData.error : undefined,
    responseData?.details?.message,
    responseData?.message,
  ]
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.toLowerCase());

  return messages.some((message) =>
    [
      "missing required coa settings",
      "account mapping",
      "coa setting",
      "finance settings validation failed",
      "chart of account",
    ].some((needle) => message.includes(needle)),
  );
}
