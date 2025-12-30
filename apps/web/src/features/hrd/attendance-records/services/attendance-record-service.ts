import apiClient from "@/lib/api-client";
import type {
  AttendanceRecordListResponse,
  AttendanceRecordResponse,
  AttendanceRecordStatsResponse,
  AttendanceRecordReportResponse,
  DeleteAttendanceRecordResponse,
} from "../types";
import type { AttendanceRecordFormData } from "../schemas/attendance.schema";

export const attendanceRecordService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    search_by?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<AttendanceRecordListResponse> {
    const response = await apiClient.get<AttendanceRecordListResponse>(
      "/hrd/attendance-records",
      { params }
    );
    return response.data;
  },

  async getById(id: number): Promise<AttendanceRecordResponse> {
    const response = await apiClient.get<AttendanceRecordResponse>(
      `/hrd/attendance-records/${id}`
    );
    return response.data;
  },

  async getStats(): Promise<AttendanceRecordStatsResponse> {
    const response = await apiClient.get<AttendanceRecordStatsResponse>(
      "/hrd/attendance-records/stats"
    );
    return response.data;
  },

  async getReport(): Promise<AttendanceRecordReportResponse> {
    const response = await apiClient.get<AttendanceRecordReportResponse>(
      "/hrd/attendance-records/report"
    );
    return response.data;
  },

  async create(data: AttendanceRecordFormData): Promise<AttendanceRecordResponse> {
    const response = await apiClient.post<AttendanceRecordResponse>(
      "/hrd/attendance-records",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: AttendanceRecordFormData
  ): Promise<AttendanceRecordResponse> {
    const response = await apiClient.put<AttendanceRecordResponse>(
      `/hrd/attendance-records/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeleteAttendanceRecordResponse> {
    const response = await apiClient.delete<DeleteAttendanceRecordResponse>(
      `/hrd/attendance-records/${id}`
    );
    return response.data;
  },
};
