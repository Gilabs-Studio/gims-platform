import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "../types";
import type { GeneralLedgerResponse } from "../types";

const BASE_URL = "/finance/reports";

export type ReportQueryParams = {
  start_date: string;
  end_date: string;
  company_id?: string;
};

export const generalLedgerService = {
  getGeneralLedger: async (params: ReportQueryParams) => {
    const response = await apiClient.get<ApiResponse<GeneralLedgerResponse>>(`${BASE_URL}/general-ledger`, { params });
    return response.data;
  },
  exportGeneralLedger: async (params: ReportQueryParams) => {
    const response = await apiClient.get(`${BASE_URL}/export/general-ledger`, {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
};
