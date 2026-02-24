import { apiClient } from "@/lib/api-client";
import type { ApiResponse, ListNonTradePayablesParams, NonTradePayable, NonTradePayableInput } from "../types";

const BASE_URL = "/finance/non-trade-payables";

export const financeNonTradePayablesService = {
  list: async (params?: ListNonTradePayablesParams): Promise<ApiResponse<NonTradePayable[]>> => {
    const response = await apiClient.get<ApiResponse<NonTradePayable[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<NonTradePayable>> => {
    const response = await apiClient.get<ApiResponse<NonTradePayable>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: NonTradePayableInput): Promise<ApiResponse<NonTradePayable>> => {
    const response = await apiClient.post<ApiResponse<NonTradePayable>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: NonTradePayableInput): Promise<ApiResponse<NonTradePayable>> => {
    const response = await apiClient.put<ApiResponse<NonTradePayable>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  approve: async (id: string): Promise<ApiResponse<NonTradePayable>> => {
    const response = await apiClient.post<ApiResponse<NonTradePayable>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },
  pay: async (id: string, data: any): Promise<ApiResponse<NonTradePayable>> => {
    const response = await apiClient.post<ApiResponse<NonTradePayable>>(`${BASE_URL}/${id}/pay`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
