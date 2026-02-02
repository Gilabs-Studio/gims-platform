import apiClient from "@/lib/api-client";
import type {
  AttendanceRecordListResponse,
  AttendanceRecordResponse,
  TodayAttendanceResponse,
  MonthlyStatsResponse,
  ClockActionResponse,
  ClockInRequest,
  ClockOutRequest,
  ManualAttendanceRequest,
} from "../types";

export const attendanceRecordService = {
  // Self-service endpoints
  async getTodayAttendance(): Promise<TodayAttendanceResponse> {
    const response = await apiClient.get<TodayAttendanceResponse>(
      "/hrd/attendance/today"
    );
    return response.data;
  },

  async clockIn(data: ClockInRequest): Promise<ClockActionResponse> {
    const response = await apiClient.post<ClockActionResponse>(
      "/hrd/attendance/clock-in",
      data
    );
    return response.data;
  },

  async clockOut(data: ClockOutRequest): Promise<ClockActionResponse> {
    const response = await apiClient.post<ClockActionResponse>(
      "/hrd/attendance/clock-out",
      data
    );
    return response.data;
  },

  async getMyMonthlyStats(params?: {
    month?: number;
    year?: number;
  }): Promise<MonthlyStatsResponse> {
    const response = await apiClient.get<MonthlyStatsResponse>(
      "/hrd/attendance/my-stats",
      { params }
    );
    return response.data;
  },

  // Admin endpoints
  async list(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    employee_id?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<AttendanceRecordListResponse> {
    const response = await apiClient.get<AttendanceRecordListResponse>(
      "/hrd/attendance",
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<AttendanceRecordResponse> {
    const response = await apiClient.get<AttendanceRecordResponse>(
      `/hrd/attendance/${id}`
    );
    return response.data;
  },

  async createManual(data: ManualAttendanceRequest): Promise<AttendanceRecordResponse> {
    const response = await apiClient.post<AttendanceRecordResponse>(
      "/hrd/attendance/manual",
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: Partial<ManualAttendanceRequest>
  ): Promise<AttendanceRecordResponse> {
    const response = await apiClient.put<AttendanceRecordResponse>(
      `/hrd/attendance/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/hrd/attendance/${id}`
    );
    return response.data;
  },

  async getEmployeeMonthlyStats(
    employeeId: string,
    params?: { month?: number; year?: number }
  ): Promise<MonthlyStatsResponse> {
    const response = await apiClient.get<MonthlyStatsResponse>(
      `/hrd/attendance/stats/${employeeId}`,
      { params }
    );
    return response.data;
  },
};

