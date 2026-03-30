import { apiClient } from "@/lib/api-client";
import { FinanceSetting, BatchUpsertFinanceSettingsRequest } from "../types";

export const financeSettingsService = {
  getAll: async () => {
    const response = await apiClient.get<{ data: FinanceSetting[] }>("/finance/settings");
    return response.data.data;
  },
  batchUpsert: async (data: BatchUpsertFinanceSettingsRequest) => {
    const response = await apiClient.put<{ data: FinanceSetting[] }>("/finance/settings", data);
    return response.data;
  },
};
