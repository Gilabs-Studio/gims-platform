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
};
