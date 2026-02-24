import { apiClient } from "@/lib/api-client";
import type { PipelineStage, CreatePipelineStageData, UpdatePipelineStageData, PipelineStageListParams, ApiResponse } from "../types";

const BASE_URL = "/crm/pipeline-stages";

export const pipelineStageService = {
  list: async (params?: PipelineStageListParams): Promise<ApiResponse<PipelineStage[]>> => {
    const response = await apiClient.get<ApiResponse<PipelineStage[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<PipelineStage>> => {
    const response = await apiClient.get<ApiResponse<PipelineStage>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: CreatePipelineStageData): Promise<ApiResponse<PipelineStage>> => {
    const response = await apiClient.post<ApiResponse<PipelineStage>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: UpdatePipelineStageData): Promise<ApiResponse<PipelineStage>> => {
    const response = await apiClient.put<ApiResponse<PipelineStage>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
