import apiClient from "@/lib/api-client";
import type {
  RecruitmentRequestListResponse,
  RecruitmentRequestSingleResponse,
  RecruitmentFormDataResponse,
  ListRecruitmentRequestsParams,
  CreateRecruitmentRequestData,
  UpdateRecruitmentRequestData,
  UpdateRecruitmentStatusData,
  UpdateFilledCountData,
} from "../types";

const BASE_PATH = "/hrd/recruitment-requests";

export const recruitmentService = {
  async list(
    params?: ListRecruitmentRequestsParams
  ): Promise<RecruitmentRequestListResponse> {
    const response = await apiClient.get<RecruitmentRequestListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.get<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getFormData(): Promise<RecruitmentFormDataResponse> {
    const response = await apiClient.get<RecruitmentFormDataResponse>(
      `${BASE_PATH}/form-data`
    );
    return response.data;
  },

  async create(
    data: CreateRecruitmentRequestData
  ): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateRecruitmentRequestData
  ): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.put<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async updateStatus(
    id: string,
    data: UpdateRecruitmentStatusData
  ): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.patch<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  // ---- Status Action Endpoints ----

  async submit(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/submit`
    );
    return response.data;
  },

  async approve(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/approve`
    );
    return response.data;
  },

  async reject(
    id: string,
    notes?: string
  ): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/reject`,
      notes ? { notes } : undefined
    );
    return response.data;
  },

  async open(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/open`
    );
    return response.data;
  },

  async close(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/close`
    );
    return response.data;
  },

  async cancel(id: string): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.post<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/cancel`
    );
    return response.data;
  },

  async updateFilledCount(
    id: string,
    data: UpdateFilledCountData
  ): Promise<RecruitmentRequestSingleResponse> {
    const response = await apiClient.patch<RecruitmentRequestSingleResponse>(
      `${BASE_PATH}/${id}/filled-count`,
      data
    );
    return response.data;
  },
};
