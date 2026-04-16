import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CashBankTransaction,
  CashBankTransactionFormData,
  CreateCashBankTransactionInput,
  ListCashBankTransactionsParams,
  ReverseCashBankTransactionInput,
} from "../types";

const BASE_URL = "/finance/cash-bank-transactions";

function normalizeListParams(params?: ListCashBankTransactionsParams): ListCashBankTransactionsParams | undefined {
  if (!params) return undefined;

  const search = params.search?.trim();

  return {
    ...params,
    search: search || undefined,
  };
}

export const cashBankTransactionsService = {
  list: async (params?: ListCashBankTransactionsParams): Promise<ApiResponse<CashBankTransaction[]>> => {
    const response = await apiClient.get<ApiResponse<CashBankTransaction[]>>(BASE_URL, {
      params: normalizeListParams(params),
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<CashBankTransaction>> => {
    const response = await apiClient.get<ApiResponse<CashBankTransaction>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  getFormData: async (companyId?: string): Promise<ApiResponse<CashBankTransactionFormData>> => {
    const response = await apiClient.get<ApiResponse<CashBankTransactionFormData>>(`${BASE_URL}/form-data`, {
      params: { company_id: companyId || undefined },
    });
    return response.data;
  },

  create: async (data: CreateCashBankTransactionInput): Promise<ApiResponse<CashBankTransaction>> => {
    const response = await apiClient.post<ApiResponse<CashBankTransaction>>(BASE_URL, data);
    return response.data;
  },

  reverse: async (id: string, data: ReverseCashBankTransactionInput): Promise<ApiResponse<CashBankTransaction>> => {
    const response = await apiClient.post<ApiResponse<CashBankTransaction>>(`${BASE_URL}/${id}/reverse`, data);
    return response.data;
  },
};
