import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  PayableRecapListParams,
  PayableRecapRow,
  PayableSummary,
} from "../types";

const BASE_URL = "/purchase/payable-recap";

export const payableRecapService = {
  list: async (
    params?: PayableRecapListParams,
  ): Promise<ApiResponse<PayableRecapRow[]>> => {
    const response = await apiClient.get<ApiResponse<PayableRecapRow[]>>(BASE_URL, { params });
    return response.data;
  },

  summary: async (): Promise<ApiResponse<PayableSummary>> => {
    const response = await apiClient.get<ApiResponse<PayableSummary>>(`${BASE_URL}/summary`);
    return response.data;
  },

  exportCsv: async (params?: PayableRecapListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
