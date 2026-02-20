import apiClient from "@/lib/api-client";
import type {
  OvertimeListResponse,
  OvertimeResponse,
  OvertimeSummaryResponse,
  NotificationsResponse,
  CreateOvertimeRequest,
  UpdateOvertimeRequest,
  ApproveOvertimeRequest,
  RejectOvertimeRequest,
  ListOvertimeParams,
  DeleteResponse,
} from "../types";

export const overtimeService = {
  // Self-service endpoints
  async getMyRequests(params?: {
    page?: number;
    per_page?: number;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<OvertimeListResponse> {
    const response = await apiClient.get<OvertimeListResponse>(
      "/hrd/overtime/my-requests",
      { params }
    );
    return response.data;
  },

  async getMySummary(params?: {
    month?: number;
    year?: number;
  }): Promise<OvertimeSummaryResponse> {
    const response = await apiClient.get<OvertimeSummaryResponse>(
      "/hrd/overtime/my-summary",
      { params }
    );
    return response.data;
  },

  async create(data: CreateOvertimeRequest): Promise<OvertimeResponse> {
    const response = await apiClient.post<OvertimeResponse>(
      "/hrd/overtime",
      data
    );
    return response.data;
  },

  async cancel(id: string): Promise<OvertimeResponse> {
    const response = await apiClient.post<OvertimeResponse>(
      `/hrd/overtime/${id}/cancel`
    );
    return response.data;
  },

  // Manager/Admin endpoints
  async list(params?: ListOvertimeParams): Promise<OvertimeListResponse> {
    const response = await apiClient.get<OvertimeListResponse>(
      "/hrd/overtime",
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<OvertimeResponse> {
    const response = await apiClient.get<OvertimeResponse>(
      `/hrd/overtime/${id}`
    );
    return response.data;
  },

  async getPending(): Promise<OvertimeListResponse> {
    const response = await apiClient.get<OvertimeListResponse>(
      "/hrd/overtime/pending"
    );
    return response.data;
  },

  async getNotifications(): Promise<NotificationsResponse> {
    const response = await apiClient.get<NotificationsResponse>(
      "/hrd/overtime/notifications"
    );
    return response.data;
  },

  async approve(
    id: string,
    data?: ApproveOvertimeRequest
  ): Promise<OvertimeResponse> {
    const response = await apiClient.post<OvertimeResponse>(
      `/hrd/overtime/${id}/approve`,
      data ?? {}
    );
    return response.data;
  },

  async reject(
    id: string,
    data: RejectOvertimeRequest
  ): Promise<OvertimeResponse> {
    const response = await apiClient.post<OvertimeResponse>(
      `/hrd/overtime/${id}/reject`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateOvertimeRequest
  ): Promise<OvertimeResponse> {
    const response = await apiClient.put<OvertimeResponse>(
      `/hrd/overtime/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<DeleteResponse> {
    const response = await apiClient.delete<DeleteResponse>(
      `/hrd/overtime/${id}`
    );
    return response.data;
  },

  async getEmployeeSummary(
    employeeId: string,
    params?: { month?: number; year?: number }
  ): Promise<OvertimeSummaryResponse> {
    const response = await apiClient.get<OvertimeSummaryResponse>(
      `/hrd/overtime/summary/${employeeId}`,
      { params }
    );
    return response.data;
  },
};
