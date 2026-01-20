import { apiClient } from "@/lib/api-client";
import type { LeaveType, CreateLeaveTypeData, UpdateLeaveTypeData, LeaveTypeListParams, ApiResponse } from "../types";

const BASE_URL = "/master-data/leave-types";

export const leaveTypeService = {
  list: async (params?: LeaveTypeListParams): Promise<ApiResponse<LeaveType[]>> => {
    const response = await apiClient.get<ApiResponse<LeaveType[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<LeaveType>> => {
    const response = await apiClient.get<ApiResponse<LeaveType>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreateLeaveTypeData): Promise<ApiResponse<LeaveType>> => {
    const response = await apiClient.post<ApiResponse<LeaveType>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdateLeaveTypeData): Promise<ApiResponse<LeaveType>> => {
    const response = await apiClient.put<ApiResponse<LeaveType>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
