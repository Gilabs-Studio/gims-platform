import { apiClient } from "@/lib/api-client";

import type {
  ApiResponse,
  AutoMatchResult,
  BankReconciliation,
  BankReconciliationFormData,
  ExcludeStatementLineInput,
  ImportBankStatementInput,
  ListBankReconciliationParams,
  MatchStatementLineInput,
} from "../types";

const BASE_URL = "/finance/bank-reconciliations";

export const bankReconciliationService = {
  list: async (params?: ListBankReconciliationParams): Promise<ApiResponse<BankReconciliation[]>> => {
    const response = await apiClient.get<ApiResponse<BankReconciliation[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<BankReconciliation>> => {
    const response = await apiClient.get<ApiResponse<BankReconciliation>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getFormData: async (companyId?: string): Promise<ApiResponse<BankReconciliationFormData>> => {
    const response = await apiClient.get<ApiResponse<BankReconciliationFormData>>(`${BASE_URL}/form-data`, {
      params: {
        company_id: companyId || undefined,
      },
    });
    return response.data;
  },

  importStatement: async (payload: ImportBankStatementInput): Promise<ApiResponse<BankReconciliation>> => {
    const formData = new FormData();
    formData.append("company_id", payload.company_id);
    formData.append("bank_account_id", payload.bank_account_id);
    formData.append("statement_date", payload.statement_date);
    if (typeof payload.statement_balance === "number" && Number.isFinite(payload.statement_balance)) {
      formData.append("statement_balance", String(payload.statement_balance));
    }
    formData.append("file_format", payload.file_format);
    formData.append("file", payload.file);

    const response = await apiClient.post<ApiResponse<BankReconciliation>>(`${BASE_URL}/import`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  autoMatch: async (id: string): Promise<ApiResponse<AutoMatchResult>> => {
    const response = await apiClient.post<ApiResponse<AutoMatchResult>>(`${BASE_URL}/${id}/auto-match`);
    return response.data;
  },

  matchLine: async (
    reconciliationId: string,
    lineId: string,
    payload: MatchStatementLineInput,
  ): Promise<ApiResponse<BankReconciliation>> => {
    const response = await apiClient.post<ApiResponse<BankReconciliation>>(
      `${BASE_URL}/${reconciliationId}/line/${lineId}/match`,
      payload,
    );
    return response.data;
  },

  excludeLine: async (
    reconciliationId: string,
    lineId: string,
    payload: ExcludeStatementLineInput,
  ): Promise<ApiResponse<BankReconciliation>> => {
    const response = await apiClient.post<ApiResponse<BankReconciliation>>(
      `${BASE_URL}/${reconciliationId}/line/${lineId}/exclude`,
      payload,
    );
    return response.data;
  },

  confirm: async (id: string): Promise<ApiResponse<BankReconciliation>> => {
    const response = await apiClient.post<ApiResponse<BankReconciliation>>(`${BASE_URL}/${id}/confirm`);
    return response.data;
  },

  lock: async (id: string): Promise<ApiResponse<BankReconciliation>> => {
    const response = await apiClient.post<ApiResponse<BankReconciliation>>(`${BASE_URL}/${id}/lock`);
    return response.data;
  },
};
