import { apiClient } from "@/lib/api-client";
import { ApiResponse, SystemAccountMapping, UpsertSystemAccountMappingRequest } from "../types";

export const financeSettingsService = {
  getAll: async (companyId?: string): Promise<ApiResponse<SystemAccountMapping[]>> => {
    const response = await apiClient.get<ApiResponse<SystemAccountMapping[]>>(
      "/finance/settings/account-mappings",
      {
        params: companyId ? { company_id: companyId } : undefined,
      },
    );
    return response.data;
  },

  upsertByKey: async (
    key: string,
    data: UpsertSystemAccountMappingRequest,
    companyId?: string,
  ): Promise<ApiResponse<SystemAccountMapping>> => {
    const response = await apiClient.put<ApiResponse<SystemAccountMapping>>(
      `/finance/settings/account-mappings/${key}`,
      data,
      {
        params: companyId ? { company_id: companyId } : undefined,
      },
    );
    return response.data;
  },

  deleteByKey: async (key: string, companyId?: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
      `/finance/settings/account-mappings/${key}`,
      {
        params: companyId ? { company_id: companyId } : undefined,
      },
    );
    return response.data;
  },
};
