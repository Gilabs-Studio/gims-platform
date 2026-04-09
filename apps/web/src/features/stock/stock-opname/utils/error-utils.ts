type StockOpnameApiErrorPayload = {
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: {
      message?: string;
      [key: string]: unknown;
    };
  };
};

export function getStockOpnameErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const responseData = (error as { response?: { data?: StockOpnameApiErrorPayload } }).response?.data;

    const detailMessage = responseData?.error?.details?.message;
    if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
      return detailMessage;
    }

    const errorMessage = responseData?.error?.message;
    if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
      return errorMessage;
    }

    const message = responseData?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function isStockOpnameMappingError(error: unknown): boolean {
  if (!(error && typeof error === "object" && "response" in error)) {
    return false;
  }

  const responseData = (error as { response?: { data?: StockOpnameApiErrorPayload } }).response?.data;

  const code = responseData?.error?.code?.toUpperCase();
  if (code) {
    const mappingCodes = ["MAPPING", "COA", "ACCOUNT", "SETTING"];
    if (mappingCodes.some((item) => code.includes(item))) {
      return true;
    }
  }

  const messages = [
    responseData?.error?.message,
    responseData?.error?.details?.message,
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
