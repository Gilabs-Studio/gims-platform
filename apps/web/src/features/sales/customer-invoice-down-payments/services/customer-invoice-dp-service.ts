import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateCustomerInvoiceDPInput,
  CustomerInvoiceDPAddResponse,
  CustomerInvoiceDPDetail,
  CustomerInvoiceDPListItem,
  CustomerInvoiceDPListParams,
  UpdateCustomerInvoiceDPInput,
} from "../types";

const BASE_URL = "/sales/customer-invoice-down-payments";

export const customerInvoiceDPService = {
  list: async (params?: CustomerInvoiceDPListParams): Promise<ApiResponse<CustomerInvoiceDPListItem[]>> => {
    const response = await apiClient.get<ApiResponse<CustomerInvoiceDPListItem[]>>(BASE_URL, { params });
    return response.data;
  },

  addData: async (): Promise<ApiResponse<CustomerInvoiceDPAddResponse>> => {
    const response = await apiClient.get<ApiResponse<CustomerInvoiceDPAddResponse>>(`${BASE_URL}/add`);
    return response.data;
  },

  create: async (data: CreateCustomerInvoiceDPInput): Promise<ApiResponse<CustomerInvoiceDPDetail>> => {
    const response = await apiClient.post<ApiResponse<CustomerInvoiceDPDetail>>(BASE_URL, data);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<CustomerInvoiceDPDetail>> => {
    const response = await apiClient.get<ApiResponse<CustomerInvoiceDPDetail>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerInvoiceDPInput): Promise<ApiResponse<CustomerInvoiceDPDetail>> => {
    const response = await apiClient.put<ApiResponse<CustomerInvoiceDPDetail>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  pending: async (id: string): Promise<ApiResponse<CustomerInvoiceDPDetail>> => {
    const response = await apiClient.post<ApiResponse<CustomerInvoiceDPDetail>>(`${BASE_URL}/${id}/pending`);
    return response.data;
  },

  exportCsv: async (params?: CustomerInvoiceDPListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
