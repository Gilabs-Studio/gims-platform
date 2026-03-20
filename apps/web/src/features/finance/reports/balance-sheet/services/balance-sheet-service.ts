import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "../types";
import type { BalanceSheetResponse } from "../types";

const BASE_URL = "/finance/reports";

export type ReportQueryParams = {
  start_date: string;
  end_date: string;
  company_id?: string;
};

export const balanceSheetService = {
  getBalanceSheet: async (params: ReportQueryParams) => {
    const response = await apiClient.get<ApiResponse<BalanceSheetResponse>>(`${BASE_URL}/balance-sheet`, { params });
    return response.data;
  },
  exportBalanceSheet: async (params: ReportQueryParams) => {
    const response = await apiClient.get(`${BASE_URL}/export/balance-sheet`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
};
