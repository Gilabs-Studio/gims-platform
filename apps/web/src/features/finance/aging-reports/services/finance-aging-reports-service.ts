import { apiClient } from "@/lib/api-client";
import type { AgingQueryParams, ApiResponse, APAgingReport, ARAgingReport } from "../types";

export const financeAgingReportsService = {
  ar: async (params?: AgingQueryParams): Promise<ApiResponse<ARAgingReport>> => {
    const response = await apiClient.get<ApiResponse<ARAgingReport>>("/finance/reports/ar-aging", { params });
    return response.data;
  },
  ap: async (params?: AgingQueryParams): Promise<ApiResponse<APAgingReport>> => {
    const response = await apiClient.get<ApiResponse<APAgingReport>>("/finance/reports/ap-aging", { params });
    return response.data;
  },
};
