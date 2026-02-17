import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderAddResponse,
  PurchaseOrderAuditTrailEntry,
  PurchaseOrderDetail,
  PurchaseOrderListItem,
  PurchaseOrderListParams,
  RevisePurchaseOrderInput,
} from "../types";

const BASE_URL = "/purchase/purchase-orders";

export const purchaseOrdersService = {
  list: async (params?: PurchaseOrderListParams): Promise<ApiResponse<PurchaseOrderListItem[]>> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderListItem[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<PurchaseOrderAddResponse>> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderAddResponse>>(
      `${BASE_URL}/add`,
    );
    return response.data;
  },

  create: async (
    data: CreatePurchaseOrderInput,
  ): Promise<ApiResponse<PurchaseOrderDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrderDetail>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdatePurchaseOrderInput,
  ): Promise<ApiResponse<PurchaseOrderDetail>> => {
    const response = await apiClient.put<ApiResponse<PurchaseOrderDetail>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<PurchaseOrderDetail>> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderDetail>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  confirm: async (id: string): Promise<ApiResponse<PurchaseOrderDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrderDetail>>(
      `${BASE_URL}/${id}/confirm`,
    );
    return response.data;
  },

  revise: async (
    id: string,
    data: RevisePurchaseOrderInput,
  ): Promise<ApiResponse<PurchaseOrderDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseOrderDetail>>(
      `${BASE_URL}/${id}/revise`,
      data,
    );
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<PurchaseOrderAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<PurchaseOrderAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: PurchaseOrderListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
