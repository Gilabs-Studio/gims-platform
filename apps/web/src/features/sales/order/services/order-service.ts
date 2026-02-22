import apiClient from "@/lib/api-client";
import type {
  SalesOrder,
  SalesOrderListResponse,
  SalesOrderSingleResponse,
  ListSalesOrdersParams,
  CreateSalesOrderData,
  UpdateSalesOrderData,
  UpdateSalesOrderStatusData,
  ConvertQuotationToOrderData,
} from "../types";

const BASE_PATH = "/sales/sales-orders";

// Sales Order Service
export const orderService = {
  async list(
    params?: ListSalesOrdersParams
  ): Promise<SalesOrderListResponse> {
    const response = await apiClient.get<SalesOrderListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.get<SalesOrderSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateSalesOrderData
  ): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.post<SalesOrderSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateSalesOrderData
  ): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.put<SalesOrderSingleResponse>(
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
    data: UpdateSalesOrderStatusData
  ): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.patch<SalesOrderSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async approve(id: string): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.post<SalesOrderSingleResponse>(
      `${BASE_PATH}/${id}/approve`
    );
    return response.data;
  },

  async convertQuotationToOrder(
    data: ConvertQuotationToOrderData
  ): Promise<SalesOrderSingleResponse> {
    const response = await apiClient.post<SalesOrderSingleResponse>(
      `${BASE_PATH}/convert-from-quotation`,
      data
    );
    return response.data;
  },
};
