import { apiClient } from "@/lib/api-client";
import type {
  VisitReport,
  CreateVisitReportData,
  UpdateVisitReportData,
  VisitReportListParams,
  VisitReportFormDataResponse,
  VisitReportProgressHistory,
  CheckInData,
  CheckOutData,
  SubmitVisitData,
  ApproveVisitData,
  RejectVisitData,
  ApiResponse,
} from "../types";

const BASE_URL = "/crm/visits";

export const visitReportService = {
  list: async (params?: VisitReportListParams): Promise<ApiResponse<VisitReport[]>> => {
    const response = await apiClient.get<ApiResponse<VisitReport[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.get<ApiResponse<VisitReport>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateVisitReportData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpdateVisitReportData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.put<ApiResponse<VisitReport>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  checkIn: async (id: string, data: CheckInData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/check-in`, data);
    return response.data;
  },

  checkOut: async (id: string, data: CheckOutData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/check-out`, data);
    return response.data;
  },

  submit: async (id: string, data?: SubmitVisitData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/submit`, data ?? {});
    return response.data;
  },

  approve: async (id: string, data?: ApproveVisitData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/approve`, data ?? {});
    return response.data;
  },

  reject: async (id: string, data: RejectVisitData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/reject`, data);
    return response.data;
  },

  uploadPhotos: async (id: string, formData: FormData): Promise<ApiResponse<VisitReport>> => {
    const response = await apiClient.post<ApiResponse<VisitReport>>(`${BASE_URL}/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<VisitReportFormDataResponse>> => {
    const response = await apiClient.get<ApiResponse<VisitReportFormDataResponse>>(`${BASE_URL}/form-data`);
    return response.data;
  },

  getProgressHistory: async (id: string): Promise<ApiResponse<VisitReportProgressHistory[]>> => {
    const response = await apiClient.get<ApiResponse<VisitReportProgressHistory[]>>(`${BASE_URL}/${id}/history`);
    return response.data;
  },
};
