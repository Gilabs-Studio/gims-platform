import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSupplierInvoiceInput,
  SupplierInvoiceAddResponse,
  SupplierInvoiceAuditTrailEntry,
  SupplierInvoiceDetail,
  SupplierInvoiceListItem,
  SupplierInvoiceListParams,
  UpdateSupplierInvoiceInput,
} from "../types";

const BASE_URL = "/purchase/supplier-invoices";

export const supplierInvoicesService = {
  list: async (params?: SupplierInvoiceListParams): Promise<ApiResponse<SupplierInvoiceListItem[]>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceListItem[]>>(BASE_URL, {
      params,
    });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<SupplierInvoiceAddResponse>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreateSupplierInvoiceInput): Promise<ApiResponse<SupplierInvoiceDetail>> => {
    const response = await apiClient.post<ApiResponse<SupplierInvoiceDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<SupplierInvoiceDetail>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateSupplierInvoiceInput,
  ): Promise<ApiResponse<SupplierInvoiceDetail>> => {
    const response = await apiClient.put<ApiResponse<SupplierInvoiceDetail>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  pending: async (id: string): Promise<ApiResponse<SupplierInvoiceDetail>> => {
    const response = await apiClient.post<ApiResponse<SupplierInvoiceDetail>>(`${BASE_URL}/${id}/pending`);
    return response.data;
  },

  auditTrail: async (
    id: string,
    params?: { page?: number; per_page?: number },
  ): Promise<ApiResponse<SupplierInvoiceAuditTrailEntry[]>> => {
    const response = await apiClient.get<ApiResponse<SupplierInvoiceAuditTrailEntry[]>>(
      `${BASE_URL}/${id}/audit-trail`,
      { params },
    );
    return response.data;
  },

  exportCsv: async (params?: SupplierInvoiceListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
