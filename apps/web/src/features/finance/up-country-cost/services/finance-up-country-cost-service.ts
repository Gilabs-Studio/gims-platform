import { apiClient } from "@/lib/api-client";
import type { ApiResponse, UpCountryCost, UpCountryCostInput, UpCountryCostStats, ListUpCountryCostParams } from "../types";

const BASE_URL = "/finance/up-country-costs";

export const financeUpCountryCostService = {
  list: async (params?: ListUpCountryCostParams): Promise<ApiResponse<UpCountryCost[]>> => {
    const response = await apiClient.get<ApiResponse<UpCountryCost[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.get<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: UpCountryCostInput): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpCountryCostInput): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.put<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<UpCountryCostStats>> => {
    const response = await apiClient.get<ApiResponse<UpCountryCostStats>>(`${BASE_URL}/stats`);
    return response.data;
  },

  submit: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/submit`);
    return response.data;
  },

  managerApprove: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/manager-approve`);
    return response.data;
  },

  managerReject: async (id: string, comment: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/manager-reject`, { comment });
    return response.data;
  },

  financeApprove: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/finance-approve`);
    return response.data;
  },

  markPaid: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/mark-paid`);
    return response.data;
  },

  // Legacy
  approve: async (id: string): Promise<ApiResponse<UpCountryCost>> => {
    const response = await apiClient.post<ApiResponse<UpCountryCost>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },
};
