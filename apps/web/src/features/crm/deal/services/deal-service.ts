import { apiClient } from "@/lib/api-client";
import type {
  Deal,
  CreateDealData,
  UpdateDealData,
  MoveDealStageData,
  MoveDealStageResponse,
  DealListParams,
  DealsByStageParams,
  DealFormDataResponse,
  DealPipelineSummary,
  DealForecast,
  DealHistory,
  ApiResponse,
  ConvertToQuotationRequest,
  ConvertToQuotationResponse,
  StockCheckResponse,
} from "../types";

const BASE_URL = "/crm/deals";

export const dealService = {
  list: async (params?: DealListParams): Promise<ApiResponse<Deal[]>> => {
    const response = await apiClient.get<ApiResponse<Deal[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Deal>> => {
    const response = await apiClient.get<ApiResponse<Deal>>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  create: async (data: CreateDealData): Promise<ApiResponse<Deal>> => {
    const response = await apiClient.post<ApiResponse<Deal>>(BASE_URL, data);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateDealData
  ): Promise<ApiResponse<Deal>> => {
    const response = await apiClient.put<ApiResponse<Deal>>(
      `${BASE_URL}/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${BASE_URL}/${id}`
    );
    return response.data;
  },

  listByStage: async (
    params: DealsByStageParams
  ): Promise<ApiResponse<Deal[]>> => {
    const response = await apiClient.get<ApiResponse<Deal[]>>(
      `${BASE_URL}/by-stage`,
      { params }
    );
    return response.data;
  },

  moveStage: async (
    id: string,
    data: MoveDealStageData
  ): Promise<ApiResponse<MoveDealStageResponse>> => {
    const response = await apiClient.post<ApiResponse<MoveDealStageResponse>>(
      `${BASE_URL}/${id}/move-stage`,
      data
    );
    return response.data;
  },

  getHistory: async (id: string): Promise<ApiResponse<DealHistory[]>> => {
    const response = await apiClient.get<ApiResponse<DealHistory[]>>(
      `${BASE_URL}/${id}/history`
    );
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<DealFormDataResponse>> => {
    const response = await apiClient.get<ApiResponse<DealFormDataResponse>>(
      `${BASE_URL}/form-data`
    );
    return response.data;
  },

  getPipelineSummary: async (): Promise<ApiResponse<DealPipelineSummary>> => {
    const response = await apiClient.get<ApiResponse<DealPipelineSummary>>(
      `${BASE_URL}/summary`
    );
    return response.data;
  },

  getForecast: async (): Promise<ApiResponse<DealForecast>> => {
    const response = await apiClient.get<ApiResponse<DealForecast>>(
      `${BASE_URL}/forecast`
    );
    return response.data;
  },

  convertToQuotation: async (
    id: string,
    data: ConvertToQuotationRequest
  ): Promise<ApiResponse<ConvertToQuotationResponse>> => {
    const response = await apiClient.post<ApiResponse<ConvertToQuotationResponse>>(
      `${BASE_URL}/${id}/convert-to-quotation`,
      data
    );
    return response.data;
  },

  stockCheck: async (id: string): Promise<ApiResponse<StockCheckResponse>> => {
    const response = await apiClient.get<ApiResponse<StockCheckResponse>>(
      `${BASE_URL}/${id}/stock-check`
    );
    return response.data;
  },
};
