import { apiClient } from "@/lib/api-client";
import type { ActivityType, CreateActivityTypeData, UpdateActivityTypeData, ActivityTypeListParams, ApiResponse } from "../types";

const BASE_URL = "/crm/activity-types";

export const activityTypeService = {
  list: async (params?: ActivityTypeListParams): Promise<ApiResponse<ActivityType[]>> => {
    const response = await apiClient.get<ApiResponse<ActivityType[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<ActivityType>> => {
    const response = await apiClient.get<ApiResponse<ActivityType>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateActivityTypeData): Promise<ApiResponse<ActivityType>> => {
    const response = await apiClient.post<ApiResponse<ActivityType>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateActivityTypeData): Promise<ApiResponse<ActivityType>> => {
    const response = await apiClient.put<ApiResponse<ActivityType>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
