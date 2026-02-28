import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSalesPaymentInput,
  SalesPaymentAddResponse,
  SalesPaymentAuditTrailEntry,
  SalesPaymentDetail,
  SalesPaymentListItem,
  SalesPaymentListParams,
} from "../types";

const BASE_URL = "/sales/payments";

export const salesPaymentsService = {
  list: async (params?: SalesPaymentListParams): Promise<ApiResponse<SalesPaymentListItem[]>> => {
    const response = await apiClient.get<ApiResponse<SalesPaymentListItem[]>>(BASE_URL, { params });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<SalesPaymentAddResponse>> => {
    const response = await apiClient.get<ApiResponse<SalesPaymentAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreateSalesPaymentInput): Promise<ApiResponse<SalesPaymentDetail>> => {
    const response = await apiClient.post<ApiResponse<SalesPaymentDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SalesPaymentDetail>> => {
    const response = await apiClient.get<ApiResponse<SalesPaymentDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  confirm: async (id: string): Promise<ApiResponse<SalesPaymentDetail>> => {
    const response = await apiClient.post<ApiResponse<SalesPaymentDetail>>(`${BASE_URL}/${id}/confirm`);
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<SalesPaymentAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<SalesPaymentAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: SalesPaymentListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Fetches the Payment Receipt PDF from the backend and opens it in a new browser tab.
   */
  openPrintWindow: async (id: string, companyId?: string): Promise<void> => {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await apiClient.get(`${BASE_URL}/${id}/print`, {
      responseType: "blob" as const,
      params,
    });
    const contentType = (response.headers["content-type"] as string) || "text/html; charset=utf-8";
    const blob = new Blob([response.data as BlobPart], { type: contentType });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
