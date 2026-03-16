import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  SalaryStructure,
  SalaryStructureInput,
  SalaryEmployeeGroup,
  SalaryStats,
  SalaryFormData,
  ListSalaryParams,
} from "../types";

const BASE_URL = "/finance/salary-structures";

export const financeSalaryService = {
  list: async (params?: ListSalaryParams): Promise<ApiResponse<SalaryStructure[]>> => {
    const response = await apiClient.get<ApiResponse<SalaryStructure[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SalaryStructure>> => {
    const response = await apiClient.get<ApiResponse<SalaryStructure>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: SalaryStructureInput): Promise<ApiResponse<SalaryStructure>> => {
    const response = await apiClient.post<ApiResponse<SalaryStructure>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: SalaryStructureInput): Promise<ApiResponse<SalaryStructure>> => {
    const response = await apiClient.put<ApiResponse<SalaryStructure>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<SalaryStructure>> => {
    const response = await apiClient.post<ApiResponse<SalaryStructure>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },

  toggleStatus: async (id: string): Promise<ApiResponse<SalaryStructure>> => {
    const response = await apiClient.post<ApiResponse<SalaryStructure>>(`${BASE_URL}/${id}/toggle-status`);
    return response.data;
  },

  getGrouped: async (params?: ListSalaryParams): Promise<ApiResponse<SalaryEmployeeGroup[]>> => {
    const response = await apiClient.get<ApiResponse<SalaryEmployeeGroup[]>>(`${BASE_URL}/grouped`, { params });
    return response.data;
  },

  getStats: async (): Promise<ApiResponse<SalaryStats>> => {
    const response = await apiClient.get<ApiResponse<SalaryStats>>(`${BASE_URL}/stats`);
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<SalaryFormData>> => {
    const response = await apiClient.get<ApiResponse<SalaryFormData>>(`${BASE_URL}/form-data`);
    return response.data;
  },
};
