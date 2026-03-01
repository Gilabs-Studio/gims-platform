import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateGoodsReceiptInput,
  GoodsReceiptAddResponse,
  GoodsReceiptAuditTrailEntry,
  GoodsReceiptConvertResponse,
  GoodsReceiptDetail,
  GoodsReceiptListItem,
  GoodsReceiptListParams,
  UpdateGoodsReceiptInput,
} from "../types";

const BASE_URL = "/purchase/goods-receipt";

export const goodsReceiptsService = {
  list: async (params?: GoodsReceiptListParams): Promise<ApiResponse<GoodsReceiptListItem[]>> => {
    const response = await apiClient.get<ApiResponse<GoodsReceiptListItem[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<GoodsReceiptAddResponse>> => {
    const response = await apiClient.get<ApiResponse<GoodsReceiptAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreateGoodsReceiptInput): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.get<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateGoodsReceiptInput): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.put<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  confirm: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}/confirm`);
    return response.data;
  },

  submit: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}/submit`);
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}/approve`);
    return response.data;
  },

  reject: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}/reject`);
    return response.data;
  },

  close: async (id: string): Promise<ApiResponse<GoodsReceiptDetail>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptDetail>>(`${BASE_URL}/${id}/close`);
    return response.data;
  },

  convertToSupplierInvoice: async (id: string): Promise<ApiResponse<GoodsReceiptConvertResponse>> => {
    const response = await apiClient.post<ApiResponse<GoodsReceiptConvertResponse>>(`${BASE_URL}/${id}/convert`);
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<GoodsReceiptAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<GoodsReceiptAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: GoodsReceiptListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Fetches the Goods Receipt PDF from the backend and opens it in a new browser tab.
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
