import { apiClient } from "@/lib/api-client";
import type { ApiResponse, CreateFinancialClosingInput, FinancialClosing, ListFinancialClosingParams } from "../types";

const BASE_URL = "/finance/closing";

export const financeClosingService = {
  list: async (params?: ListFinancialClosingParams): Promise<ApiResponse<FinancialClosing[]>> => {
    const response = await apiClient.get<ApiResponse<FinancialClosing[]>>(BASE_URL, { params });
    return response.data;
  },

  create: async (data: CreateFinancialClosingInput): Promise<ApiResponse<FinancialClosing>> => {
    const response = await apiClient.post<ApiResponse<FinancialClosing>>(BASE_URL, data);
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<FinancialClosing>> => {
    const response = await apiClient.post<ApiResponse<FinancialClosing>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },

  getAnalysis: async (id: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get<ApiResponse<any>>(`${BASE_URL}/${id}/analysis`);
    return response.data;
  },
};
