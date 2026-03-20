import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSalesReturnInput,
  SalesReturnAuditTrailEntry,
  SalesReturn,
  SalesReturnFormData,
  SalesReturnListParams,
  UpdateSalesReturnStatusInput,
} from "../types";

const BASE_PATH = "/sales/returns";

const toOptionalString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const salesReturnsService = {
  async getFormData(): Promise<ApiResponse<SalesReturnFormData>> {
    const response = await apiClient.get<ApiResponse<SalesReturnFormData>>(`${BASE_PATH}/form-data`);
    return response.data;
  },

  async list(params?: SalesReturnListParams): Promise<ApiResponse<SalesReturn[]>> {
    const response = await apiClient.get<ApiResponse<SalesReturn[]>>(BASE_PATH, { params });
    return response.data;
  },

  async getById(id: string): Promise<ApiResponse<SalesReturn>> {
    const response = await apiClient.get<ApiResponse<SalesReturn>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async auditTrail(id: string, params?: { page?: number; per_page?: number }): Promise<ApiResponse<SalesReturnAuditTrailEntry[]>> {
    const response = await apiClient.get<ApiResponse<SalesReturnAuditTrailEntry[]>>(`${BASE_PATH}/${id}/audit-trail`, { params });
    return response.data;
  },

  async create(data: CreateSalesReturnInput): Promise<ApiResponse<SalesReturn>> {
    const payload: CreateSalesReturnInput = {
      ...data,
      invoice_id: toOptionalString(data.invoice_id),
      delivery_id: toOptionalString(data.delivery_id),
      customer_id: toOptionalString(data.customer_id),
      notes: toOptionalString(data.notes),
      items: data.items.map((item) => ({
        ...item,
        invoice_item_id: toOptionalString(item.invoice_item_id),
        uom_id: toOptionalString(item.uom_id),
        notes: toOptionalString(item.notes),
      })),
    };

    const response = await apiClient.post<ApiResponse<SalesReturn>>(BASE_PATH, payload);
    return response.data;
  },

  async updateStatus(id: string, data: UpdateSalesReturnStatusInput): Promise<ApiResponse<SalesReturn>> {
    const response = await apiClient.patch<ApiResponse<SalesReturn>>(`${BASE_PATH}/${id}/status`, data);
    return response.data;
  },

  async remove(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_PATH}/${id}`);
    return response.data;
  },
};
