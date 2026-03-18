import apiClient from "@/lib/api-client";
import type {
  ApiResponse,
  CreateSalesReturnInput,
  SalesReturn,
  SalesReturnFormData,
  SalesReturnListParams,
} from "../types";

const BASE_PATH = "/sales/returns";

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

  async create(data: CreateSalesReturnInput): Promise<ApiResponse<SalesReturn>> {
    const response = await apiClient.post<ApiResponse<SalesReturn>>(BASE_PATH, data);
    return response.data;
  },
};
