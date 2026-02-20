import apiClient from "@/lib/api-client";
import type {
  EducationHistoryListResponse,
  EducationHistorySingleResponse,
  EducationHistoryFormDataResponse,
  ListEducationHistoriesParams,
  CreateEducationHistoryData,
  UpdateEducationHistoryData,
} from "../types";

const BASE_PATH = "/hrd/employee-education-histories";

// Employee Education History Service
export const educationHistoryService = {
  async list(
    params?: ListEducationHistoriesParams
  ): Promise<EducationHistoryListResponse> {
    const response = await apiClient.get<EducationHistoryListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<EducationHistorySingleResponse> {
    const response = await apiClient.get<EducationHistorySingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getByEmployeeId(
    employeeId: string
  ): Promise<EducationHistoryListResponse> {
    const response = await apiClient.get<EducationHistoryListResponse>(
      `${BASE_PATH}/employee/${employeeId}`
    );
    return response.data;
  },

  async getFormData(): Promise<EducationHistoryFormDataResponse> {
    const response = await apiClient.get<EducationHistoryFormDataResponse>(
      `${BASE_PATH}/form-data`
    );
    return response.data;
  },

  async create(
    data: CreateEducationHistoryData
  ): Promise<EducationHistorySingleResponse> {
    const response = await apiClient.post<EducationHistorySingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateEducationHistoryData
  ): Promise<EducationHistorySingleResponse> {
    const response = await apiClient.put<EducationHistorySingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },
};
