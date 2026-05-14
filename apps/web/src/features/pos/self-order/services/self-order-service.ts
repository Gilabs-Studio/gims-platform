import type {
  ApiResponse,
  PublicTableInfo,
  CreateCustomerOrderRequest,
  CustomerOrderResponse,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
} from "../types";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
const BASE = `${API_ORIGIN}/api/v1/public/pos/tables`;

async function request<T>(
  url: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const selfOrderService = {
  getTableInfo(token: string): Promise<ApiResponse<PublicTableInfo>> {
    return request<PublicTableInfo>(`${BASE}/${token}`);
  },

  createOrder(
    token: string,
    data: CreateCustomerOrderRequest
  ): Promise<ApiResponse<CustomerOrderResponse>> {
    return request<CustomerOrderResponse>(`${BASE}/${token}/orders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getOrderStatus(
    token: string,
    orderId: string
  ): Promise<ApiResponse<CustomerOrderResponse>> {
    return request<CustomerOrderResponse>(`${BASE}/${token}/orders/${orderId}`);
  },

  initiatePayment(
    token: string,
    orderId: string,
    data: InitiatePaymentRequest
  ): Promise<ApiResponse<InitiatePaymentResponse>> {
    return request<InitiatePaymentResponse>(
      `${BASE}/${token}/orders/${orderId}/pay/digital`,
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  markPayAtCashier(
    token: string,
    orderId: string
  ): Promise<ApiResponse<{ acknowledged: boolean }>> {
    return request<{ acknowledged: boolean }>(
      `${BASE}/${token}/orders/${orderId}/pay/cashier`,
      { method: "POST" }
    );
  },
};
