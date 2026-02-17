import { apiClient } from "@/lib/api-client";
import type { ApiResponse, AssetCategory, AssetCategoryInput, ListAssetCategoryParams } from "../types";

const BASE_URL = "/finance/asset-categories";

export const financeAssetCategoriesService = {
  list: async (params?: ListAssetCategoryParams): Promise<ApiResponse<AssetCategory[]>> => {
    const response = await apiClient.get<ApiResponse<AssetCategory[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<AssetCategory>> => {
    const response = await apiClient.get<ApiResponse<AssetCategory>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: AssetCategoryInput): Promise<ApiResponse<AssetCategory>> => {
    const response = await apiClient.post<ApiResponse<AssetCategory>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: AssetCategoryInput): Promise<ApiResponse<AssetCategory>> => {
    const response = await apiClient.put<ApiResponse<AssetCategory>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
