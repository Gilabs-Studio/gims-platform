import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  CreatePurchaseReturnInput,
  PurchaseReturn,
  PurchaseReturnFormData,
  PurchaseReturnListParams,
} from "../types";

const BASE_PATH = "/purchase/returns";

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
    const response = await apiClient.post<ApiResponse<PurchaseReturn>>(BASE_PATH, data);
    return response.data;
  },
};
