import { apiClient } from "@/lib/api-client";

import type {
  ApiResponse,
  CashFlowStatementResponse,
  CashFlowStatementTableData,
  CashFlowSummaryData,
  CashFlowTrendData,
  CashFlowYtdSummaryData,
} from "../types";

const BASE_URL = "/finance/reports";

export type CashFlowQueryParams = {
  from_date: string;
  to_date: string;
  company_id?: string;
  fiscal_year_id?: string;
  months?: number;
};

export const cashFlowStatementService = {
  getCashFlowStatement: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowStatementResponse>>(`${BASE_URL}/cash-flow`, {
      params,
    });
    return response.data;
  },

  getCashFlowSummary: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowSummaryData>>(`${BASE_URL}/cash-flow/summary`, {
      params,
    });
    return response.data;
  },

  getCashFlowTrend: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowTrendData>>(`${BASE_URL}/cash-flow/trend`, {
      params,
    });
    return response.data;
  },

  getCashFlowYtdSummary: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowYtdSummaryData>>(`${BASE_URL}/cash-flow/ytd-summary`, {
      params,
    });
    return response.data;
  },

  getCashFlowStatementTable: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowStatementTableData>>(`${BASE_URL}/cash-flow/statement`, {
      params,
    });
    return response.data;
  },
};
