import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateFinancialClosingInput,
  FinancialClosing,
  FinancialClosingAnalysisResponse,
  ListFinancialClosingParams,
} from "../types";

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

  reopen: async (id: string): Promise<ApiResponse<FinancialClosing>> => {
    const response = await apiClient.post<ApiResponse<FinancialClosing>>(`${BASE_URL}/${id}/reopen`);
    return response.data;
  },

  yearEndClose: async (fiscalYear: number): Promise<ApiResponse<FinancialClosing>> => {
    const response = await apiClient.post<ApiResponse<FinancialClosing>>(`${BASE_URL}/year-end-close`, {
      fiscal_year: fiscalYear,
    });
    return response.data;
  },

  getAnalysis: async (id: string): Promise<ApiResponse<FinancialClosingAnalysisResponse>> => {
    const response = await apiClient.get<ApiResponse<FinancialClosingAnalysisResponse>>(`${BASE_URL}/${id}/analysis`);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },
};
