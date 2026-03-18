import { apiClient } from "@/lib/api-client";
import type {
  AdjustAssetInput,
  ApiResponse,
  Asset,
  AssetInput,
  DepreciateAssetInput,
  DisposeAssetInput,
  ListAssetsParams,
  RevalueAssetInput,
  SellAssetInput,
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

  sell: async (id: string, data: SellAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/sell`, data);
    return response.data;
  },

  revalue: async (id: string, data: RevalueAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/revalue`, data);
    return response.data;
  },

  adjust: async (id: string, data: AdjustAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/adjust`, data);
    return response.data;
  },

  approveTransaction: async (txId: string): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/transactions/${txId}/approve`);
    return response.data;
  },
};
