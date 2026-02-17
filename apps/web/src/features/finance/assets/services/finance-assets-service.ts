import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  Asset,
  AssetInput,
  DepreciateAssetInput,
  DisposeAssetInput,
  ListAssetsParams,
  TransferAssetInput,
} from "../types";

const BASE_URL = "/finance/assets";

export const financeAssetsService = {
  list: async (params?: ListAssetsParams): Promise<ApiResponse<Asset[]>> => {
    const response = await apiClient.get<ApiResponse<Asset[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.get<ApiResponse<Asset>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: AssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: AssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.put<ApiResponse<Asset>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  depreciate: async (id: string, data: DepreciateAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/depreciate`, data);
    return response.data;
  },

  transfer: async (id: string, data: TransferAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/transfer`, data);
    return response.data;
  },

  dispose: async (id: string, data: DisposeAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/dispose`, data);
    return response.data;
  },
};
