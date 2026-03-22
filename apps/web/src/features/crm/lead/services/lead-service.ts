import { apiClient } from "@/lib/api-client";
import type {
  Lead,
  CreateLeadData,
  UpdateLeadData,
  ConvertLeadData,
  LeadListParams,
  LeadFormDataResponse,
  LeadAnalytics,
  LeadProductItem,
  BulkUpsertLeadRequest,
  BulkUpsertLeadResponse,
  LeadAutomationConnectionResponse,
  LeadAutomationTriggerRequest,
  LeadAutomationTriggerResponse,
  ApiResponse,
} from "../types";

const BASE_URL = "/crm/leads";

export const leadService = {
  list: async (params?: LeadListParams): Promise<ApiResponse<Lead[]>> => {
    const response = await apiClient.get<ApiResponse<Lead[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Lead>> => {
    const response = await apiClient.get<ApiResponse<Lead>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateLeadData): Promise<ApiResponse<Lead>> => {
    const response = await apiClient.post<ApiResponse<Lead>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: UpdateLeadData): Promise<ApiResponse<Lead>> => {
    const response = await apiClient.put<ApiResponse<Lead>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  convert: async (id: string, data: ConvertLeadData): Promise<ApiResponse<Lead>> => {
    const response = await apiClient.post<ApiResponse<Lead>>(`${BASE_URL}/${id}/convert`, data);
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<LeadFormDataResponse>> => {
    const response = await apiClient.get<ApiResponse<LeadFormDataResponse>>(`${BASE_URL}/form-data`);
    return response.data;
  },

  getAnalytics: async (): Promise<ApiResponse<LeadAnalytics>> => {
    const response = await apiClient.get<ApiResponse<LeadAnalytics>>(`${BASE_URL}/analytics`);
    return response.data;
  },

  bulkUpsert: async (data: BulkUpsertLeadRequest): Promise<ApiResponse<BulkUpsertLeadResponse>> => {
    const response = await apiClient.post<ApiResponse<BulkUpsertLeadResponse>>(`${BASE_URL}/upsert`, data);
    return response.data;
  },

  getProductItems: async (id: string): Promise<ApiResponse<LeadProductItem[]>> => {
    const response = await apiClient.get<ApiResponse<LeadProductItem[]>>(`${BASE_URL}/${id}/product-items`);
    return response.data;
  },

  testAutomationConnection: async (): Promise<ApiResponse<LeadAutomationConnectionResponse>> => {
    const response = await apiClient.post<ApiResponse<LeadAutomationConnectionResponse>>(
      `${BASE_URL}/automation/test-connection`
    );
    return response.data;
  },

  triggerAutomation: async (
    data: LeadAutomationTriggerRequest
  ): Promise<ApiResponse<LeadAutomationTriggerResponse>> => {
    const response = await apiClient.post<ApiResponse<LeadAutomationTriggerResponse>>(
      `${BASE_URL}/automation/trigger`,
      data
    );
    return response.data;
  },
};
