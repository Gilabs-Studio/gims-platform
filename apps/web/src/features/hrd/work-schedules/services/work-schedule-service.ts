import apiClient from "@/lib/api-client";
import type {
  WorkScheduleListResponse,
  WorkScheduleResponse,
  WorkScheduleFormDataResponse,
  CreateWorkScheduleRequest,
  UpdateWorkScheduleRequest,
  DeleteResponse,
} from "../types";

export const workScheduleService = {
  async getFormData(): Promise<WorkScheduleFormDataResponse> {
    const response = await apiClient.get<WorkScheduleFormDataResponse>(
      "/hrd/work-schedules/form-data",
    );
    return response.data;
  },

  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: string;
  }): Promise<WorkScheduleListResponse> {
    const response = await apiClient.get<WorkScheduleListResponse>(
      "/hrd/work-schedules",
      { params },
    );
    return response.data;
  },

  async getById(id: string): Promise<WorkScheduleResponse> {
    const response = await apiClient.get<WorkScheduleResponse>(
      `/hrd/work-schedules/${id}`,
    );
    return response.data;
  },

  async getDefault(): Promise<WorkScheduleResponse> {
    const response = await apiClient.get<WorkScheduleResponse>(
      "/hrd/work-schedules/default",
    );
    return response.data;
  },

  async create(data: CreateWorkScheduleRequest): Promise<WorkScheduleResponse> {
    const response = await apiClient.post<WorkScheduleResponse>(
      "/hrd/work-schedules",
      data,
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateWorkScheduleRequest,
  ): Promise<WorkScheduleResponse> {
    const response = await apiClient.put<WorkScheduleResponse>(
      `/hrd/work-schedules/${id}`,
      data,
    );
    return response.data;
  },

  async setDefault(id: string): Promise<WorkScheduleResponse> {
    const response = await apiClient.post<WorkScheduleResponse>(
      `/hrd/work-schedules/${id}/set-default`,
    );
    return response.data;
  },

  async delete(id: string): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>(
      `/hrd/work-schedules/${id}`,
    );
    return response.data;
  },
};
