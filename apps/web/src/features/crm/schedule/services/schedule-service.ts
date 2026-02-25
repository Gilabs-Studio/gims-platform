import { apiClient } from "@/lib/api-client";
import type {
  Schedule,
  CreateScheduleData,
  UpdateScheduleData,
  ScheduleFormData,
  ScheduleListParams,
  ApiResponse,
  PaginationMeta,
} from "../types";

const BASE = "/crm/schedules";

export const scheduleService = {
  list: async (params: ScheduleListParams = {}): Promise<ApiResponse<Schedule[]> & { meta: { pagination: PaginationMeta } }> => {
    const response = await apiClient.get<ApiResponse<Schedule[]> & { meta: { pagination: PaginationMeta } }>(BASE, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.get<ApiResponse<Schedule>>(`${BASE}/${id}`);
    return response.data;
  },

  create: async (data: CreateScheduleData): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.post<ApiResponse<Schedule>>(BASE, data);
    return response.data;
  },

  update: async (id: string, data: UpdateScheduleData): Promise<ApiResponse<Schedule>> => {
    const response = await apiClient.put<ApiResponse<Schedule>>(`${BASE}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`);
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<ScheduleFormData>> => {
    const response = await apiClient.get<ApiResponse<ScheduleFormData>>(`${BASE}/form-data`);
    return response.data;
  },
};
