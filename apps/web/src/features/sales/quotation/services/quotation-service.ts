import apiClient from "@/lib/api-client";
import type {
  SalesQuotationListResponse,
  SalesQuotationSingleResponse,
  SalesQuotationItemsListResponse,
  ListSalesQuotationsParams,
  ListSalesQuotationItemsParams,
  CreateSalesQuotationData,
  UpdateSalesQuotationData,
  UpdateSalesQuotationStatusData,
} from "../types";
import type { AuditTrailApiResponse } from "@/components/ui/audit-trail-table";

const BASE_PATH = "/sales/sales-quotations";

// Sales Quotation Service
export const quotationService = {
  async list(
    params?: ListSalesQuotationsParams
  ): Promise<SalesQuotationListResponse> {
    const response = await apiClient.get<SalesQuotationListResponse>(
      BASE_PATH,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<SalesQuotationSingleResponse> {
    const response = await apiClient.get<SalesQuotationSingleResponse>(
      `${BASE_PATH}/${id}`
    );
    return response.data;
  },

  async getItems(
    id: string,
    params?: ListSalesQuotationItemsParams
  ): Promise<SalesQuotationItemsListResponse> {
    const response = await apiClient.get<SalesQuotationItemsListResponse>(
      `${BASE_PATH}/${id}/items`,
      { params }
    );
    return response.data;
  },

  async create(
    data: CreateSalesQuotationData
  ): Promise<SalesQuotationSingleResponse> {
    const response = await apiClient.post<SalesQuotationSingleResponse>(
      BASE_PATH,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateSalesQuotationData
  ): Promise<SalesQuotationSingleResponse> {
    const response = await apiClient.put<SalesQuotationSingleResponse>(
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
    data: UpdateSalesQuotationStatusData
  ): Promise<SalesQuotationSingleResponse> {
    const response = await apiClient.patch<SalesQuotationSingleResponse>(
      `${BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  },

  async auditTrail(
    id: string,
    params?: { page?: number; per_page?: number }
    ): Promise<AuditTrailApiResponse> {
      const response = await apiClient.get<AuditTrailApiResponse>(
      `${BASE_PATH}/${id}/audit-trail`,
      { params }
    );
    return response.data;
  },

  /**
   * Fetches the print document (HTML) from the backend via the authenticated API client,
   * then opens it in a new browser tab. The browser's built-in print dialog handles printing.
   * Fetching instead of navigating directly avoids SameSite=Strict cookie restrictions.
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
    // Free memory after the PDF tab has loaded
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
