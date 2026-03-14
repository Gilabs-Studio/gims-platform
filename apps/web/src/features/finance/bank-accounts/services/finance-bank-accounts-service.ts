import { apiClient } from "@/lib/api-client";
import type { ApiResponse, BankAccount, BankAccountInput, ListBankAccountsParams, UnifiedBankAccount } from "../types";

const BASE_URL = "/finance/bank-accounts";

export const financeBankAccountsService = {
  list: async (params?: ListBankAccountsParams): Promise<ApiResponse<UnifiedBankAccount[]>> => {
    const response = await apiClient.get<ApiResponse<UnifiedBankAccount[]>>(`${BASE_URL}/unified`, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<BankAccount>> => {
    const response = await apiClient.get<ApiResponse<BankAccount>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: BankAccountInput): Promise<ApiResponse<BankAccount>> => {
    const payload = {
      ...data,
      chart_of_account_id: data.chart_of_account_id ?? null,
      currency_id: data.currency_id,
      is_active: data.is_active ?? true,
    };
    const response = await apiClient.post<ApiResponse<BankAccount>>(BASE_URL, payload);
    return response.data;
  },

  update: async (id: string, data: BankAccountInput): Promise<ApiResponse<BankAccount>> => {
    const payload = {
      ...data,
      chart_of_account_id: data.chart_of_account_id ?? null,
      currency_id: data.currency_id,
      is_active: data.is_active ?? true,
    };
    const response = await apiClient.put<ApiResponse<BankAccount>>(`${BASE_URL}/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },
};
