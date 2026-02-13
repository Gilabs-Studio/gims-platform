import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  ChartOfAccount,
  ChartOfAccountTreeNode,
  CreateChartOfAccountInput,
  ListChartOfAccountsParams,
  UpdateChartOfAccountInput,
} from "../types";

const BASE_URL = "/finance/chart-of-accounts";

export const financeCoaService = {
  list: async (params?: ListChartOfAccountsParams): Promise<ApiResponse<ChartOfAccount[]>> => {
    const response = await apiClient.get<ApiResponse<ChartOfAccount[]>>(BASE_URL, { params });
    return response.data;
  },

  tree: async (params?: { only_active?: boolean }): Promise<ApiResponse<ChartOfAccountTreeNode[]>> => {
    const response = await apiClient.get<ApiResponse<ChartOfAccountTreeNode[]>>(`${BASE_URL}/tree`, {
      params,
    });
    return response.data;
  },

  create: async (data: CreateChartOfAccountInput): Promise<ApiResponse<ChartOfAccount>> => {
    const response = await apiClient.post<ApiResponse<ChartOfAccount>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpdateChartOfAccountInput): Promise<ApiResponse<ChartOfAccount>> => {
    const response = await apiClient.put<ApiResponse<ChartOfAccount>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
