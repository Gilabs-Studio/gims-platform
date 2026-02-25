import { apiClient } from "@/lib/api-client";
import type {
  Activity,
  CreateActivityData,
  ActivityListParams,
  ApiResponse,
} from "../types";

const BASE_URL = "/crm/activities";

export const activityService = {
  list: async (params?: ActivityListParams): Promise<ApiResponse<Activity[]>> => {
    const response = await apiClient.get<ApiResponse<Activity[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Activity>> => {
    const response = await apiClient.get<ApiResponse<Activity>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateActivityData): Promise<ApiResponse<Activity>> => {
    const response = await apiClient.post<ApiResponse<Activity>>(BASE_URL, data);
    return response.data;
  },

  timeline: async (params?: ActivityListParams): Promise<ApiResponse<Activity[]>> => {
    const response = await apiClient.get<ApiResponse<Activity[]>>(`${BASE_URL}/timeline`, { params });
    return response.data;
  },
};
