import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSupplierInvoiceDPInput,
  SupplierInvoiceDPAddResponse,
  SupplierInvoiceDPDetail,
  SupplierInvoiceDPListItem,
  SupplierInvoiceDPListParams,
  UpdateSupplierInvoiceDPInput,
} from "../types";

const BASE_URL = "/purchase/supplier-invoice-down-payments";

export const supplierInvoiceDPService = {
  list: async (params?: SupplierInvoiceDPListParams): Promise<ApiResponse<SupplierInvoiceDPListItem[]>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceDPListItem[]>>(BASE_URL, { params });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<SupplierInvoiceDPAddResponse>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceDPAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreateSupplierInvoiceDPInput): Promise<ApiResponse<SupplierInvoiceDPDetail>> => {
    const response = await apiClient.post<ApiResponse<SupplierInvoiceDPDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SupplierInvoiceDPDetail>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceDPDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateSupplierInvoiceDPInput): Promise<ApiResponse<SupplierInvoiceDPDetail>> => {
    const response = await apiClient.put<ApiResponse<SupplierInvoiceDPDetail>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  pending: async (id: string): Promise<ApiResponse<SupplierInvoiceDPDetail>> => {
    const response = await apiClient.post<ApiResponse<SupplierInvoiceDPDetail>>(`${BASE_URL}/${id}/pending`);
    return response.data;
  },

  exportCsv: async (params?: SupplierInvoiceDPListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },

  /**
   * Fetches the Supplier Invoice Down Payment PDF from the backend and opens it in a new browser tab.
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
