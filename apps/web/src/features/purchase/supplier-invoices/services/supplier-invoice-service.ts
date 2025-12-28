import apiClient from "@/lib/api-client";
import type {
  SupplierInvoiceListResponse,
  SupplierInvoiceResponse,
  SupplierInvoiceAddDataResponse,
  DeleteSupplierInvoiceResponse,
  CreateTaxInvoiceResponse,
  AuditTrailResponse,
} from "../types";
import type {
  CreateSupplierInvoiceFormData,
  UpdateSupplierInvoiceFormData,
} from "../schemas/supplier-invoice.schema";

export const supplierInvoiceService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    status?: "DRAFT" | "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE";
    sort_by?: string;
    sort_order?: "asc" | "desc";
    start_date?: string;
    end_date?: string;
  }): Promise<SupplierInvoiceListResponse> {
    const response = await apiClient.get<SupplierInvoiceListResponse>(
      "/purchase/supplier-invoices",
      {
        params,
      }
    );
    return response.data;
  },

  async getById(id: number): Promise<SupplierInvoiceResponse> {
    const response = await apiClient.get<SupplierInvoiceResponse>(
      `/purchase/supplier-invoices/${id}`
    );
    return response.data;
  },

  async getAddData(): Promise<SupplierInvoiceAddDataResponse> {
    const response = await apiClient.get<SupplierInvoiceAddDataResponse>(
      "/purchase/supplier-invoices/add"
    );
    return response.data;
  },

  async create(data: CreateSupplierInvoiceFormData): Promise<SupplierInvoiceResponse> {
    const response = await apiClient.post<SupplierInvoiceResponse>(
      "/purchase/supplier-invoices",
      data
    );
    return response.data;
  },

  async update(
    id: number,
    data: UpdateSupplierInvoiceFormData
  ): Promise<SupplierInvoiceResponse> {
    const response = await apiClient.put<SupplierInvoiceResponse>(
      `/purchase/supplier-invoices/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: number): Promise<DeleteSupplierInvoiceResponse> {
    const response = await apiClient.delete<DeleteSupplierInvoiceResponse>(
      `/purchase/supplier-invoices/${id}`
    );
    return response.data;
  },

  async setPending(id: number): Promise<SupplierInvoiceResponse> {
    const response = await apiClient.post<SupplierInvoiceResponse>(
      `/purchase/supplier-invoices/${id}/pending`
    );
    return response.data;
  },

  async getPrint(id: number): Promise<SupplierInvoiceResponse> {
    const response = await apiClient.get<SupplierInvoiceResponse>(
      `/purchase/supplier-invoices/${id}/print`
    );
    return response.data;
  },

  async createTaxInvoice(
    id: number,
    data: { tax_invoice_number: string; tax_invoice_date: string }
  ): Promise<CreateTaxInvoiceResponse> {
    const response = await apiClient.post<CreateTaxInvoiceResponse>(
      `/purchase/supplier-invoices/${id}/tax-invoice`,
      data
    );
    return response.data;
  },

  async getAuditTrail(id: number, params?: { page?: number; limit?: number }): Promise<AuditTrailResponse> {
    const response = await apiClient.get<AuditTrailResponse>(
      `/purchase/supplier-invoices/${id}/audit-trail`,
      { params }
    );
    return response.data;
  },
};




