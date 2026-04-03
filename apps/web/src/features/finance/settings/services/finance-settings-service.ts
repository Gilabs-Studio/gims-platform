import { apiClient } from "@/lib/api-client";
import { FinanceSetting, BatchUpsertFinanceSettingsRequest, ApiResponse } from "../types";

export const financeSettingsService = {
  getAll: async (): Promise<ApiResponse<FinanceSetting[]>> => {
    const response = await apiClient.get<ApiResponse<FinanceSetting[]>>("/finance/settings");
    return response.data;
  },
  batchUpsert: async (data: BatchUpsertFinanceSettingsRequest): Promise<ApiResponse<FinanceSetting[]>> => {
    const response = await apiClient.put<ApiResponse<FinanceSetting[]>>("/finance/settings", data);
    return response.data;
  },
};
