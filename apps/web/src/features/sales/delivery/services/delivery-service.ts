import apiClient from "@/lib/api-client";
import type {
  DeliveryOrder,
  DeliveryOrderListResponse,
  DeliveryOrderSingleResponse,
  ListDeliveryOrdersParams,
  CreateDeliveryOrderData,
  UpdateDeliveryOrderData,
  UpdateDeliveryOrderStatusData,
  ShipDeliveryOrderData,
  DeliverDeliveryOrderData,
  BatchSelectionRequest,
  BatchSelectionResponse,
} from "../types";
import type { SalesAuditTrailApiResponse } from "../../components/sales-audit-trail-table";

const BASE_PATH = "/sales/delivery-orders";

// Delivery Order Service
export const deliveryService = {
  async list(
    params?: ListDeliveryOrdersParams
  ): Promise<DeliveryOrderListResponse> {
    const response = await apiClient.get<DeliveryOrderListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.get<DeliveryOrderSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateDeliveryOrderData
  ): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.post<DeliveryOrderSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateDeliveryOrderData
  ): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.put<DeliveryOrderSingleResponse>(
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
    data: UpdateDeliveryOrderStatusData
  ): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.patch<DeliveryOrderSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async approve(id: string): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.post<DeliveryOrderSingleResponse>(
      `${BASE_PATH}/${id}/approve`
    );
    return response.data;
  },

  async ship(
    id: string,
    data: ShipDeliveryOrderData
  ): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.post<DeliveryOrderSingleResponse>(
      `${BASE_PATH}/${id}/ship`,
      data
    );
    return response.data;
  },

  async deliver(
    id: string,
    data: DeliverDeliveryOrderData
  ): Promise<DeliveryOrderSingleResponse> {
    const response = await apiClient.post<DeliveryOrderSingleResponse>(
      `${BASE_PATH}/${id}/deliver`,
      data
    );
    return response.data;
  },

  async selectBatches(
    data: BatchSelectionRequest
  ): Promise<BatchSelectionResponse> {
    const response = await apiClient.post<BatchSelectionResponse>(
      `${BASE_PATH}/select-batches`,
      data
    );
    return response.data;
  },

  async auditTrail(
    id: string,
    params?: { page?: number; per_page?: number }
  ): Promise<SalesAuditTrailApiResponse> {
    const response = await apiClient.get<SalesAuditTrailApiResponse>(
      `${BASE_PATH}/${id}/audit-trail`,
      { params }
    );
    return response.data;
  },
};
