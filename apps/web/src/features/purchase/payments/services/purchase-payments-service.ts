import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePurchasePaymentInput,
  PurchasePaymentAddResponse,
  PurchasePaymentAuditTrailEntry,
  PurchasePaymentDetail,
  PurchasePaymentListItem,
  PurchasePaymentListParams,
} from "../types";

const BASE_URL = "/purchase/payments";

export const purchasePaymentsService = {
  list: async (params?: PurchasePaymentListParams): Promise<ApiResponse<PurchasePaymentListItem[]>> => {
    const response = await apiClient.get<ApiResponse<PurchasePaymentListItem[]>>(BASE_URL, { params });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<PurchasePaymentAddResponse>> => {
    const response = await apiClient.get<ApiResponse<PurchasePaymentAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreatePurchasePaymentInput): Promise<ApiResponse<PurchasePaymentDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchasePaymentDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<PurchasePaymentDetail>> => {
    const response = await apiClient.get<ApiResponse<PurchasePaymentDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  confirm: async (id: string): Promise<ApiResponse<PurchasePaymentDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchasePaymentDetail>>(`${BASE_URL}/${id}/confirm`);
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<PurchasePaymentAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<PurchasePaymentAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: PurchasePaymentListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
