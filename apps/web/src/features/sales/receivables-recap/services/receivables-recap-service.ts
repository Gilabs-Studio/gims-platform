import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  ReceivablesRecapListParams,
  ReceivablesRecapRow,
  ReceivablesSummary,
} from "../types";

const BASE_URL = "/sales/receivables-recap";

export const receivablesRecapService = {
  list: async (
    params?: ReceivablesRecapListParams,
  ): Promise<ApiResponse<ReceivablesRecapRow[]>> => {
    const response = await apiClient.get<ApiResponse<ReceivablesRecapRow[]>>(BASE_URL, { params });
    return response.data;
  },

  summary: async (): Promise<ApiResponse<ReceivablesSummary>> => {
    const response = await apiClient.get<ApiResponse<ReceivablesSummary>>(`${BASE_URL}/summary`);
    return response.data;
  },

  exportCsv: async (params?: ReceivablesRecapListParams): Promise<Blob> => {
    const response = await apiClient.get(`${BASE_URL}/export`, {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
