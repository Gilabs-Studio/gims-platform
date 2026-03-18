import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePurchaseReturnInput,
  PurchaseReturn,
  PurchaseReturnFormData,
  PurchaseReturnListParams,
  UpdatePurchaseReturnStatusInput,
} from "../types";

const BASE_PATH = "/purchase/returns";

const toOptionalString = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const purchaseReturnsService = {
  async getFormData(): Promise<ApiResponse<PurchaseReturnFormData>> {
    const response = await apiClient.get<ApiResponse<PurchaseReturnFormData>>(`${BASE_PATH}/form-data`);
    return response.data;
  },

  async list(params?: PurchaseReturnListParams): Promise<ApiResponse<PurchaseReturn[]>> {
    const response = await apiClient.get<ApiResponse<PurchaseReturn[]>>(BASE_PATH, { params });
    return response.data;
  },

  async getById(id: string): Promise<ApiResponse<PurchaseReturn>> {
    const response = await apiClient.get<ApiResponse<PurchaseReturn>>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreatePurchaseReturnInput): Promise<ApiResponse<PurchaseReturn>> {
    const payload: CreatePurchaseReturnInput = {
      ...data,
      goods_receipt_id: data.goods_receipt_id.trim(),
      purchase_order_id: toOptionalString(data.purchase_order_id),
      supplier_id: toOptionalString(data.supplier_id),
      notes: toOptionalString(data.notes),
      items: data.items.map((item) => ({
        ...item,
        goods_receipt_item_id: toOptionalString(item.goods_receipt_item_id),
        uom_id: toOptionalString(item.uom_id),
        notes: toOptionalString(item.notes),
      })),
    };

    const response = await apiClient.post<ApiResponse<PurchaseReturn>>(BASE_PATH, payload);
    return response.data;
  },

  async updateStatus(id: string, data: UpdatePurchaseReturnStatusInput): Promise<ApiResponse<PurchaseReturn>> {
    const response = await apiClient.patch<ApiResponse<PurchaseReturn>>(`${BASE_PATH}/${id}/status`, data);
    return response.data;
  },

  async remove(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_PATH}/${id}`);
    return response.data;
  },
};
