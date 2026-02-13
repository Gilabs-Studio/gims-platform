import { apiClient } from "@/lib/api-client";
import type { ApiResponse, ListTaxInvoicesParams, TaxInvoice, TaxInvoiceCreateInput, TaxInvoiceUpdateInput } from "../types";

const BASE_URL = "/finance/tax-invoices";

export const financeTaxInvoicesService = {
  list: async (params?: ListTaxInvoicesParams): Promise<ApiResponse<TaxInvoice[]>> => {
    const response = await apiClient.get<ApiResponse<TaxInvoice[]>>(BASE_URL, { params });
    return response.data;
  },
  getById: async (id: string): Promise<ApiResponse<TaxInvoice>> => {
    const response = await apiClient.get<ApiResponse<TaxInvoice>>(`${BASE_URL}/${id}`);
    return response.data;
  },
  create: async (data: TaxInvoiceCreateInput): Promise<ApiResponse<TaxInvoice>> => {
    const response = await apiClient.post<ApiResponse<TaxInvoice>>(BASE_URL, data);
    return response.data;
  },
  update: async (id: string, data: TaxInvoiceUpdateInput): Promise<ApiResponse<TaxInvoice>> => {
    const response = await apiClient.put<ApiResponse<TaxInvoice>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
