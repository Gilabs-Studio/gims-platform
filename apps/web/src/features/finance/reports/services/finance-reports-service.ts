import { apiClient } from "@/lib/api-client";
import type {
  GeneralLedgerResponse,
  BalanceSheetResponse,
  ProfitAndLossResponse,
  ApiResponse
} from "../types";

const BASE_URL = "/finance/reports";

export const financeReportsService = {
  getGeneralLedger: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get<ApiResponse<GeneralLedgerResponse>>(`${BASE_URL}/general-ledger`, { params });
    return response.data;
  },

  getBalanceSheet: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get<ApiResponse<BalanceSheetResponse>>(`${BASE_URL}/balance-sheet`, { params });
    return response.data;
  },

  getProfitAndLoss: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get<ApiResponse<ProfitAndLossResponse>>(`${BASE_URL}/profit-loss`, { params });
    return response.data;
  },

  exportGeneralLedger: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get(`${BASE_URL}/export/general-ledger`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportBalanceSheet: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get(`${BASE_URL}/export/balance-sheet`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportProfitAndLoss: async (params: { start_date: string; end_date: string }) => {
    const response = await apiClient.get(`${BASE_URL}/export/profit-loss`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
};
