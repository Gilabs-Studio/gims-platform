import { apiClient } from "@/lib/api-client";
import type { LeadSource, CreateLeadSourceData, UpdateLeadSourceData, LeadSourceListParams, ApiResponse } from "../types";

const BASE_URL = "/crm/lead-sources";

export const leadSourceService = {
  list: async (params?: LeadSourceListParams): Promise<ApiResponse<LeadSource[]>> => {
    const response = await apiClient.get<ApiResponse<LeadSource[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<LeadSource>> => {
    const response = await apiClient.get<ApiResponse<LeadSource>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateLeadSourceData): Promise<ApiResponse<LeadSource>> => {
    const response = await apiClient.post<ApiResponse<LeadSource>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateLeadSourceData): Promise<ApiResponse<LeadSource>> => {
    const response = await apiClient.put<ApiResponse<LeadSource>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
