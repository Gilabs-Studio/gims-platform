import { apiClient } from "@/lib/api-client";
import type { ApiResponse, AssetLocation, AssetLocationInput, ListAssetLocationParams } from "../types";

const BASE_URL = "/finance/asset-locations";

export const financeAssetLocationsService = {
  list: async (params?: ListAssetLocationParams): Promise<ApiResponse<AssetLocation[]>> => {
    const response = await apiClient.get<ApiResponse<AssetLocation[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<AssetLocation>> => {
    const response = await apiClient.get<ApiResponse<AssetLocation>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: AssetLocationInput): Promise<ApiResponse<AssetLocation>> => {
    const response = await apiClient.post<ApiResponse<AssetLocation>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: AssetLocationInput): Promise<ApiResponse<AssetLocation>> => {
    const response = await apiClient.put<ApiResponse<AssetLocation>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
