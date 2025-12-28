import apiClient from "@/lib/api-client";
import type {
  SupplierInvoiceDownPaymentListResponse,
  SupplierInvoiceDownPaymentResponse,
  SupplierInvoiceDownPaymentAddDataResponse,
  PendingInvoiceResponse,
  DeleteSupplierInvoiceDownPaymentResponse,
} from "../types";
import type {
  CreateSupplierInvoiceDownPaymentFormData,
  UpdateSupplierInvoiceDownPaymentFormData,
} from "../schemas/supplier-invoice-down-payment.schema";

export const supplierInvoiceDownPaymentService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "DRAFT" | "UNPAID" | "PAID";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<SupplierInvoiceDownPaymentListResponse> {
    const response = await apiClient.get<SupplierInvoiceDownPaymentListResponse>(
      "/purchase/supplier-invoice-down-payments",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<SupplierInvoiceDownPaymentResponse> {
    const response = await apiClient.get<SupplierInvoiceDownPaymentResponse>(
      `/purchase/supplier-invoice-down-payments/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<SupplierInvoiceDownPaymentAddDataResponse> {
    const response = await apiClient.get<SupplierInvoiceDownPaymentAddDataResponse>(
      "/purchase/supplier-invoice-down-payments/add"
    );
    return response.data;
  },

  async create(
    data: CreateSupplierInvoiceDownPaymentFormData
  ): Promise<SupplierInvoiceDownPaymentResponse> {
    const response = await apiClient.post<SupplierInvoiceDownPaymentResponse>(
      "/purchase/supplier-invoice-down-payments",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdateSupplierInvoiceDownPaymentFormData
  ): Promise<SupplierInvoiceDownPaymentResponse> {
    const response = await apiClient.put<SupplierInvoiceDownPaymentResponse>(
      `/purchase/supplier-invoice-down-payments/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeleteSupplierInvoiceDownPaymentResponse> {
    const response = await apiClient.delete<DeleteSupplierInvoiceDownPaymentResponse>(
      `/purchase/supplier-invoice-down-payments/${id}`
    );
    return response.data;
  },

  async pending(id: number): Promise<PendingInvoiceResponse> {
    const response = await apiClient.post<PendingInvoiceResponse>(
      `/purchase/supplier-invoice-down-payments/${id}/pending`
    );
    return response.data;
  },

  async print(id: number): Promise<SupplierInvoiceDownPaymentResponse> {
    const response = await apiClient.get<SupplierInvoiceDownPaymentResponse>(
      `/purchase/supplier-invoice-down-payments/${id}/print`
    );
    return response.data;
  },
};




