import { apiClient } from "@/lib/api-client";
import type { LeadStatus, CreateLeadStatusData, UpdateLeadStatusData, LeadStatusListParams, ApiResponse } from "../types";

const BASE_URL = "/crm/lead-statuses";

export const leadStatusService = {
  list: async (params?: LeadStatusListParams): Promise<ApiResponse<LeadStatus[]>> => {
    const response = await apiClient.get<ApiResponse<LeadStatus[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<LeadStatus>> => {
    const response = await apiClient.get<ApiResponse<LeadStatus>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateLeadStatusData): Promise<ApiResponse<LeadStatus>> => {
    const response = await apiClient.post<ApiResponse<LeadStatus>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateLeadStatusData): Promise<ApiResponse<LeadStatus>> => {
    const response = await apiClient.put<ApiResponse<LeadStatus>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
