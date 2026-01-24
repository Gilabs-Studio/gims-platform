import apiClient from "@/lib/api-client";
import type {
  SalesEstimation,
  SalesEstimationListResponse,
  SalesEstimationSingleResponse,
  SalesEstimationItemsListResponse,
  ListSalesEstimationsParams,
  ListSalesEstimationItemsParams,
  CreateSalesEstimationData,
  UpdateSalesEstimationData,
  UpdateSalesEstimationStatusData,
  ConvertToQuotationData,
  ConvertToQuotationResponse,
} from "../types";

const BASE_PATH = "/sales/sales-estimations";

// Sales Estimation Service
export const estimationService = {
  async list(
    params?: ListSalesEstimationsParams
  ): Promise<SalesEstimationListResponse> {
    const response = await apiClient.get<SalesEstimationListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<SalesEstimationSingleResponse> {
    const response = await apiClient.get<SalesEstimationSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getItems(
    id: string,
    params?: ListSalesEstimationItemsParams
  ): Promise<SalesEstimationItemsListResponse> {
    const response = await apiClient.get<SalesEstimationItemsListResponse>(
      `${BASE_PATH}/${id}/items`,
      { params }
    );
    return response.data;
  },

  async create(
    data: CreateSalesEstimationData
  ): Promise<SalesEstimationSingleResponse> {
    const response = await apiClient.post<SalesEstimationSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateSalesEstimationData
  ): Promise<SalesEstimationSingleResponse> {
    const response = await apiClient.put<SalesEstimationSingleResponse>(
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
    data: UpdateSalesEstimationStatusData
  ): Promise<SalesEstimationSingleResponse> {
    const response = await apiClient.patch<SalesEstimationSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async convertToQuotation(
    id: string,
    data: ConvertToQuotationData
  ): Promise<ConvertToQuotationResponse> {
    const response = await apiClient.post<ConvertToQuotationResponse>(
      `${BASE_PATH}/${id}/convert-to-quotation`,
      data
    );
    return response.data;
  },
};
