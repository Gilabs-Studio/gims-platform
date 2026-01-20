import { apiClient } from "@/lib/api-client";
import type { SOSource, CreateSOSourceData, UpdateSOSourceData, SOSourceListParams, ApiResponse } from "../types";

const BASE_URL = "/master-data/so-sources";

export const soSourceService = {
  list: async (params?: SOSourceListParams): Promise<ApiResponse<SOSource[]>> => {
    const response = await apiClient.get<ApiResponse<SOSource[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<SOSource>> => {
    const response = await apiClient.get<ApiResponse<SOSource>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateSOSourceData): Promise<ApiResponse<SOSource>> => {
    const response = await apiClient.post<ApiResponse<SOSource>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateSOSourceData): Promise<ApiResponse<SOSource>> => {
    const response = await apiClient.put<ApiResponse<SOSource>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
