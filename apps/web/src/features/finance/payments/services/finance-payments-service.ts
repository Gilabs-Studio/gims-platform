import { apiClient } from "@/lib/api-client";
import type { ApiResponse, ListPaymentsParams, Payment, PaymentInput } from "../types";

const BASE_URL = "/finance/ap/payments";

function normalizeListParams(params?: ListPaymentsParams): ListPaymentsParams | undefined {
  if (!params) return undefined;

  const search = params.search?.trim();

  return {
    ...params,
    search: search || undefined,
  };
}

export const financePaymentsService = {
  list: async (params?: ListPaymentsParams): Promise<ApiResponse<Payment[]>> => {
    const response = await apiClient.get<ApiResponse<Payment[]>>(BASE_URL, {
      params: normalizeListParams(params),
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Payment>> => {
    const response = await apiClient.get<ApiResponse<Payment>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: PaymentInput): Promise<ApiResponse<Payment>> => {
    const response = await apiClient.post<ApiResponse<Payment>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: PaymentInput): Promise<ApiResponse<Payment>> => {
    const response = await apiClient.put<ApiResponse<Payment>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<Payment>> => {
    const response = await apiClient.post<ApiResponse<Payment>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },
  reverse: async (id: string, reason: string): Promise<ApiResponse<Payment>> => {
    const response = await apiClient.post<ApiResponse<Payment>>(`${BASE_URL}/${id}/reverse`, { reason });
    return response.data;
  },
};
