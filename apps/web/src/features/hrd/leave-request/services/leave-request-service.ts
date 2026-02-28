import { apiClient } from "@/lib/api-client";
import type {
  LeaveRequestDetail,
  LeaveRequestsResponse,
  LeaveFormDataResponse,
  LeaveBalancesResponse,
  CreateLeaveRequestPayload,
  UpdateLeaveRequestPayload,
  ApproveLeaveRequestPayload,
  RejectLeaveRequestPayload,
  CancelLeaveRequestPayload,
  LeaveRequestFilters,
} from "../types";

const BASE_PATH = "/hrd/leave-requests";
const SELF_PATH = `${BASE_PATH}/self`;

export const leaveRequestService = {
  async getLeaveRequests(filters?: LeaveRequestFilters): Promise<LeaveRequestsResponse> {
    const response = await apiClient.get<LeaveRequestsResponse>(BASE_PATH, {
      params: filters,
    });
    return response.data;
  },

  async getLeaveRequestById(id: string): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.get<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async getFormData(): Promise<LeaveFormDataResponse> {
    const response = await apiClient.get<LeaveFormDataResponse>(`${BASE_PATH}/form-data`);
    return response.data;
  },

  async getMyLeaveBalance(): Promise<LeaveBalancesResponse> {
    const response = await apiClient.get<LeaveBalancesResponse>(`${BASE_PATH}/my-balance`);
    return response.data;
  },

  async getMyFormData(): Promise<LeaveFormDataResponse> {
    const response = await apiClient.get<LeaveFormDataResponse>(`${BASE_PATH}/my-form-data`);
    return response.data;
  },

  async getEmployeeLeaveBalance(employeeId: string): Promise<LeaveBalancesResponse> {
    const response = await apiClient.get<LeaveBalancesResponse>(
      `${BASE_PATH}/employee/${employeeId}/balance`
    );
    return response.data;
  },

  async createLeaveRequest(data: CreateLeaveRequestPayload): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(BASE_PATH, data);
    return response.data;
  },

  async updateLeaveRequest(
    id: string,
    data: UpdateLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.put<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(`${BASE_PATH}/${id}`, data);
    return response.data;
  },

  async deleteLeaveRequest(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  async approveLeaveRequest(
    id: string,
    data: ApproveLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(
      `${BASE_PATH}/${id}/approve`,
      data
    );
    return response.data;
  },

  async rejectLeaveRequest(
    id: string,
    data: RejectLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(
      `${BASE_PATH}/${id}/reject`,
      data
    );
    return response.data;
  },

  async cancelLeaveRequest(
    id: string,
    data: CancelLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(
      `${BASE_PATH}/${id}/cancel`,
      data
    );
    return response.data;
  },

  async getMyLeaveRequests(filters?: LeaveRequestFilters): Promise<LeaveRequestsResponse> {
    const response = await apiClient.get<LeaveRequestsResponse>(SELF_PATH, {
      params: filters,
    });
    return response.data;
  },

  async getMyLeaveRequestById(id: string): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.get<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(`${SELF_PATH}/${id}`);
    return response.data;
  },

  async createMyLeaveRequest(data: Omit<CreateLeaveRequestPayload, "employee_id">): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(SELF_PATH, data);
    return response.data;
  },

  async updateMyLeaveRequest(
    id: string,
    data: UpdateLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.put<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(`${SELF_PATH}/${id}`, data);
    return response.data;
  },

  async cancelMyLeaveRequest(
    id: string,
    data: CancelLeaveRequestPayload
  ): Promise<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }> {
    const response = await apiClient.post<{ success: boolean; data: LeaveRequestDetail; timestamp: string; request_id: string }>(
      `${SELF_PATH}/${id}/cancel`,
      data
    );
    return response.data;
  },
};
