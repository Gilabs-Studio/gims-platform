import apiClient from "@/lib/api-client";
import type {
  CustomerInvoiceListResponse,
  CustomerInvoiceSingleResponse,
  CustomerInvoiceItemsListResponse,
  ListCustomerInvoicesParams,
  ListCustomerInvoiceItemsParams,
  CreateCustomerInvoiceData,
  UpdateCustomerInvoiceData,
  UpdateCustomerInvoiceStatusData,
} from "../types";

const BASE_PATH = "/sales/customer-invoices";

// Customer Invoice Service
export const invoiceService = {
  async list(
    params?: ListCustomerInvoicesParams
  ): Promise<CustomerInvoiceListResponse> {
    const response = await apiClient.get<CustomerInvoiceListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.get<CustomerInvoiceSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getItems(
    id: string,
    params?: ListCustomerInvoiceItemsParams
  ): Promise<CustomerInvoiceItemsListResponse> {
    const response = await apiClient.get<CustomerInvoiceItemsListResponse>(
      `${BASE_PATH}/${id}/items`,
      { params }
    );
    return response.data;
  },

  async create(
    data: CreateCustomerInvoiceData
  ): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.post<CustomerInvoiceSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateCustomerInvoiceData
  ): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.put<CustomerInvoiceSingleResponse>(
      `${BASE_PATH}/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async updateStatus(
    id: string,
    data: UpdateCustomerInvoiceStatusData
  ): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.patch<CustomerInvoiceSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async approve(id: string): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.post<CustomerInvoiceSingleResponse>(
      `${BASE_PATH}/${id}/approve`
    );
    return response.data;
  },

  /**
   * Fetches the Customer Invoice PDF from the backend and opens it in a new browser tab.
   */
  async openPrintWindow(id: string, companyId?: string): Promise<void> {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await apiClient.get(
      `${BASE_PATH}/${id}/print`,
      { responseType: "blob" as const, params }
    );
    const contentType = (response.headers["content-type"] as string) || "text/html; charset=utf-8";
    const blob = new Blob([response.data as BlobPart], { type: contentType });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
