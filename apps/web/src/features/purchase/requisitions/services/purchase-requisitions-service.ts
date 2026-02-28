import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePurchaseRequisitionInput,
  PurchaseRequisitionConvertResponse,
  PurchaseRequisitionAddResponse,
  PurchaseRequisitionAuditTrailEntry,
  PurchaseRequisitionDetail,
  PurchaseRequisitionListItem,
  PurchaseRequisitionListParams,
  UpdatePurchaseRequisitionInput,
} from "../types";

const BASE_URL = "/purchase/purchase-requisitions";

export const purchaseRequisitionsService = {
  list: async (
    params?: PurchaseRequisitionListParams,
  ): Promise<ApiResponse<PurchaseRequisitionListItem[]>> => {
    const response = await apiClient.get<ApiResponse<PurchaseRequisitionListItem[]>>(
      BASE_URL,
      { params },
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<PurchaseRequisitionDetail>> => {
    const response = await apiClient.get<ApiResponse<PurchaseRequisitionDetail>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreatePurchaseRequisitionInput,
  ): Promise<ApiResponse<PurchaseRequisitionDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseRequisitionDetail>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdatePurchaseRequisitionInput,
  ): Promise<ApiResponse<PurchaseRequisitionDetail>> => {
    const response = await apiClient.put<ApiResponse<PurchaseRequisitionDetail>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  addData: async (): Promise<ApiResponse<PurchaseRequisitionAddResponse>> => {
    const response = await apiClient.get<ApiResponse<PurchaseRequisitionAddResponse>>(
      `${BASE_URL}/add`,
    );
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<PurchaseRequisitionDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseRequisitionDetail>>(
      `${BASE_URL}/${id}/approve`,
    );
    return response.data;
  },

  reject: async (id: string): Promise<ApiResponse<PurchaseRequisitionDetail>> => {
    const response = await apiClient.post<ApiResponse<PurchaseRequisitionDetail>>(
      `${BASE_URL}/${id}/reject`,
    );
    return response.data;
  },

  convert: async (id: string): Promise<ApiResponse<PurchaseRequisitionConvertResponse>> => {
    const response = await apiClient.post<ApiResponse<PurchaseRequisitionConvertResponse>>(
      `${BASE_URL}/${id}/convert`,
    );
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<PurchaseRequisitionAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<PurchaseRequisitionAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: PurchaseRequisitionListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Fetches the Purchase Requisition PDF from the backend and opens it in a new browser tab.
   */
  openPrintWindow: async (id: string, companyId?: string): Promise<void> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await apiClient.get(`${BASE_URL}/${id}/print`, {
      responseType: "blob" as const,
      params,
    });
    const contentType = (response.headers["content-type"] as string) || "application/pdf";
    const blob = new Blob([response.data as BlobPart], { type: contentType });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
