import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "../types";
import type { ProfitAndLossResponse } from "../types";

const BASE_URL = "/finance/reports";

export type ReportQueryParams = {
  start_date: string;
  end_date: string;
  company_id?: string;
};

export const profitLossService = {
  getProfitAndLoss: async (params: ReportQueryParams) => {
    const response = await apiClient.get<ApiResponse<ProfitAndLossResponse>>(`${BASE_URL}/profit-loss`, { params });
    return response.data;
  },
  exportProfitAndLoss: async (params: ReportQueryParams) => {
    const response = await apiClient.get(`${BASE_URL}/export/profit-loss`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
};
