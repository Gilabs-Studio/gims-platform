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
  RecordPaymentData,
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

  async recordPayment(
    id: string,
    data: RecordPaymentData
  ): Promise<CustomerInvoiceSingleResponse> {
    const response = await apiClient.post<CustomerInvoiceSingleResponse>(
      `${BASE_PATH}/${id}/payments`,
      data
    );
    return response.data;
  },
};
