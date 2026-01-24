import apiClient from "@/lib/api-client";
import type {
  SalesVisit,
  SalesVisitListResponse,
  SalesVisitSingleResponse,
  SalesVisitDetailsListResponse,
  SalesVisitProgressHistoryListResponse,
  ListSalesVisitsParams,
  ListSalesVisitDetailsParams,
  ListSalesVisitProgressHistoryParams,
  CreateSalesVisitData,
  UpdateSalesVisitData,
  UpdateSalesVisitStatusData,
  CheckInData,
  CheckOutData,
} from "../types";

const BASE_PATH = "/sales/sales-visits";

// Sales Visit Service
export const visitService = {
  async list(params?: ListSalesVisitsParams): Promise<SalesVisitListResponse> {
    const response = await apiClient.get<SalesVisitListResponse>(BASE_PATH, {
      params,
    });
    return response.data;
  },

  async getById(id: string): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.get<SalesVisitSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getDetails(
    id: string,
    params?: ListSalesVisitDetailsParams
  ): Promise<SalesVisitDetailsListResponse> {
    const response = await apiClient.get<SalesVisitDetailsListResponse>(
      `${BASE_PATH}/${id}/details`,
      { params }
    );
    return response.data;
  },

  async getProgressHistory(
    id: string,
    params?: ListSalesVisitProgressHistoryParams
  ): Promise<SalesVisitProgressHistoryListResponse> {
    const response = await apiClient.get<SalesVisitProgressHistoryListResponse>(
      `${BASE_PATH}/${id}/history`,
      { params }
    );
    return response.data;
  },

  async create(data: CreateSalesVisitData): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.post<SalesVisitSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateSalesVisitData
  ): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.put<SalesVisitSingleResponse>(
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
    data: UpdateSalesVisitStatusData
  ): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.patch<SalesVisitSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async checkIn(
    id: string,
    data: CheckInData
  ): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.post<SalesVisitSingleResponse>(
      `${BASE_PATH}/${id}/check-in`,
      data
    );
    return response.data;
  },

  async checkOut(
    id: string,
    data: CheckOutData
  ): Promise<SalesVisitSingleResponse> {
    const response = await apiClient.post<SalesVisitSingleResponse>(
      `${BASE_PATH}/${id}/check-out`,
      data
    );
    return response.data;
  },
};
