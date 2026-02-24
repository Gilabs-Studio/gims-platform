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

  /**
   * Fetches the PDF from the backend via the authenticated API client,
   * then opens it in a new browser tab using the built-in PDF viewer.
   * This avoids cross-origin cookie restrictions (SameSite=Strict).
   */
  async openPrintWindow(id: string, companyId?: string): Promise<void> {
    const params = companyId ? { company_id: companyId } : undefined;
    const response = await apiClient.get(
      `${BASE_PATH}/${id}/print`,
      { responseType: "blob" as const, params }
    );
    const blob = new Blob([response.data as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    // Free memory after the PDF tab has loaded
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
