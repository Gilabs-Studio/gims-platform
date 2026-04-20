import { apiClient } from "@/lib/api-client";

import type { ApiResponse, CashFlowStatementResponse } from "../types";

const BASE_URL = "/finance/reports";

export type CashFlowQueryParams = {
  from_date: string;
  to_date: string;
  company_id?: string;
  fiscal_year_id?: string;
};

export const cashFlowStatementService = {
  getCashFlowStatement: async (params: CashFlowQueryParams) => {
    const response = await apiClient.get<ApiResponse<CashFlowStatementResponse>>(`${BASE_URL}/cash-flow`, {
      params,
    });
    return response.data;
  },
};
