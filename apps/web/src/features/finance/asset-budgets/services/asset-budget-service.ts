import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  AssetBudget,
  CreateAssetBudgetInput,
  UpdateAssetBudgetInput,
  ChangeAssetBudgetStatusInput,
  ListAssetBudgetsParams,
  AssetBudgetFormData,
} from "../types";

const BASE_URL = "/finance/budgets";

export const assetBudgetService = {
  list: async (
    params?: ListAssetBudgetsParams,
  ): Promise<ApiResponse<AssetBudget[]>> => {
    const response = await apiClient.get<ApiResponse<AssetBudget[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<AssetBudget>> => {
    const response = await apiClient.get<ApiResponse<AssetBudget>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  getByCode: async (code: string): Promise<ApiResponse<AssetBudget>> => {
    const response = await apiClient.get<ApiResponse<AssetBudget>>(
      `${BASE_URL}/code/${code}`,
    );
    return response.data;
  },

  create: async (
    data: CreateAssetBudgetInput,
  ): Promise<ApiResponse<AssetBudget>> => {
    const response = await apiClient.post<ApiResponse<AssetBudget>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateAssetBudgetInput,
  ): Promise<ApiResponse<AssetBudget>> => {
    const response = await apiClient.put<ApiResponse<AssetBudget>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  changeStatus: async (
    id: string,
    data: ChangeAssetBudgetStatusInput,
  ): Promise<ApiResponse<AssetBudget>> => {
    const response = await apiClient.patch<ApiResponse<AssetBudget>>(
      `${BASE_URL}/${id}/status`,
      data,
    );
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<AssetBudgetFormData>> => {
    const response = await apiClient.get<ApiResponse<AssetBudgetFormData>>(
      `${BASE_URL}/form-data`,
    );
    return response.data;
  },
};

export default assetBudgetService;
