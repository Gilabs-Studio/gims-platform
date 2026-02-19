import apiClient from "@/lib/api-client";
import type {
  AttendanceRecordListResponse,
  AttendanceRecordResponse,
  TodayAttendanceResponse,
  MonthlyStatsResponse,
  ClockActionResponse,
  AttendanceFormDataResponse,
  ClockInRequest,
  ClockOutRequest,
  ManualAttendanceRequest,
  UpdateAttendanceRequest,
  ListAttendanceRecordsParams,
} from "../types";

const BASE_PATH = "/hrd/attendance";

export const attendanceRecordService = {
  // Self-service endpoints
  async getTodayAttendance(): Promise<TodayAttendanceResponse> {
    const response = await apiClient.get<TodayAttendanceResponse>(
      `${BASE_PATH}/today`
    );
    return response.data;
  },

  async clockIn(data: ClockInRequest): Promise<ClockActionResponse> {
    const response = await apiClient.post<ClockActionResponse>(
      `${BASE_PATH}/clock-in`,
      data
    );
    return response.data;
  },

  async clockOut(data: ClockOutRequest): Promise<ClockActionResponse> {
    const response = await apiClient.post<ClockActionResponse>(
      `${BASE_PATH}/clock-out`,
      data
    );
    return response.data;
  },

  async getMyMonthlyStats(params?: {
    month?: number;
    year?: number;
  }): Promise<MonthlyStatsResponse> {
    const response = await apiClient.get<MonthlyStatsResponse>(
      `${BASE_PATH}/my-stats`,
      { params }
    );
    return response.data;
  },

  // Form data for dropdowns
  async getFormData(): Promise<AttendanceFormDataResponse> {
    const response = await apiClient.get<AttendanceFormDataResponse>(
      `${BASE_PATH}/form-data`
    );
    return response.data;
  },

  // Admin endpoints
  async list(params?: ListAttendanceRecordsParams): Promise<AttendanceRecordListResponse> {
    const response = await apiClient.get<AttendanceRecordListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<AttendanceRecordResponse> {
    const response = await apiClient.get<AttendanceRecordResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async createManual(data: ManualAttendanceRequest): Promise<AttendanceRecordResponse> {
    const response = await apiClient.post<AttendanceRecordResponse>(
      `${BASE_PATH}/manual`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateAttendanceRequest
  ): Promise<AttendanceRecordResponse> {
    const response = await apiClient.put<AttendanceRecordResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getEmployeeMonthlyStats(
    employeeId: string,
    params?: { month?: number; year?: number }
  ): Promise<MonthlyStatsResponse> {
    const response = await apiClient.get<MonthlyStatsResponse>(
      `${BASE_PATH}/stats/${employeeId}`,
      { params }
    );
    return response.data;
  },
};

