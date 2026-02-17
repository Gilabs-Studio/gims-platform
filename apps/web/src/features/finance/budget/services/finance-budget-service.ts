import { apiClient } from "@/lib/api-client";
import type { ApiResponse, Budget, BudgetInput, ListBudgetsParams } from "../types";

const BASE_URL = "/finance/budget";

export const financeBudgetService = {
  list: async (params?: ListBudgetsParams): Promise<ApiResponse<Budget[]>> => {
    const response = await apiClient.get<ApiResponse<Budget[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.get<ApiResponse<Budget>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: BudgetInput): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.post<ApiResponse<Budget>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: BudgetInput): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.put<ApiResponse<Budget>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<Budget>> => {
    const response = await apiClient.post<ApiResponse<Budget>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },
};
