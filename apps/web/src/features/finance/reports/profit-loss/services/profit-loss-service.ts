import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  ProfitAndLossResponse,
  ProfitLossQueryParams,
  ProfitLossSummary,
  ProfitLossTrend,
  ProfitLossRevenueVsExpense,
  ProfitLossStatementTable,
} from "../types";

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

  getSummary: async (params: ProfitLossQueryParams) => {
    const response = await apiClient.get<ApiResponse<ProfitLossSummary>>(`${BASE_URL}/profit-loss/summary`, {
      params,
    });
    return response.data;
  },

  getTrend: async (params: ProfitLossQueryParams) => {
    const response = await apiClient.get<ApiResponse<ProfitLossTrend>>(`${BASE_URL}/profit-loss/trend`, {
      params,
    });
    return response.data;
  },

  getRevenueVsExpense: async (params: ProfitLossQueryParams) => {
    const response = await apiClient.get<ApiResponse<ProfitLossRevenueVsExpense>>(
      `${BASE_URL}/profit-loss/revenue-vs-expense`,
      { params },
    );
    return response.data;
  },

  getStatementTable: async (params: ProfitLossQueryParams) => {
    const response = await apiClient.get<ApiResponse<ProfitLossStatementTable>>(`${BASE_URL}/profit-loss/statement`, {
      params,
    });
    return response.data;
  },

  exportProfitAndLoss: async (params: ReportQueryParams) => {
    const response = await apiClient.get(`${BASE_URL}/export/profit-loss`, {
      params,
      responseType: "blob",
    });
    return response.data;
  },
};
