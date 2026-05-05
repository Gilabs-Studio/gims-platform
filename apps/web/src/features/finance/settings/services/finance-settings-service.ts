import { apiClient } from "@/lib/api-client";
import {
  ApiResponse,
  CreateFiscalYearInput,
  CreateTaxConfigurationInput,
  FiscalYear,
  ListFiscalYearParams,
  ListTaxConfigurationParams,
  SystemAccountMapping,
  TaxConfiguration,
  InventorySettings,
  UpdateInventorySettingsInput,
  InventoryAverageCost,
  UpsertOpeningBalanceInput,
  OpeningBalanceValidation,
  OpeningBalanceSummary,
  OpeningBalanceSimulation,
  PostOpeningBalanceInput,
  PostOpeningBalanceResult,
  UpdateFiscalYearInput,
  UpdateTaxConfigurationInput,
  UpsertSystemAccountMappingRequest,
} from "../types";

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

  listFiscalYears: async (params: ListFiscalYearParams): Promise<ApiResponse<FiscalYear[]>> => {
    const response = await apiClient.get<ApiResponse<FiscalYear[]>>("/finance/fiscal-years", {
      params,
    });
    return response.data;
  },

  createFiscalYear: async (data: CreateFiscalYearInput): Promise<ApiResponse<FiscalYear>> => {
    const response = await apiClient.post<ApiResponse<FiscalYear>>("/finance/fiscal-years", data);
    return response.data;
  },

  updateFiscalYear: async (
    id: string,
    companyId: string,
    data: UpdateFiscalYearInput,
  ): Promise<ApiResponse<FiscalYear>> => {
    const response = await apiClient.put<ApiResponse<FiscalYear>>(`/finance/fiscal-years/${id}`, data, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  activateFiscalYear: async (id: string, companyId: string): Promise<ApiResponse<FiscalYear>> => {
    const response = await apiClient.patch<ApiResponse<FiscalYear>>(`/finance/fiscal-years/${id}/activate`, {}, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  lockFiscalYear: async (id: string, companyId: string): Promise<ApiResponse<FiscalYear>> => {
    const response = await apiClient.patch<ApiResponse<FiscalYear>>(`/finance/fiscal-years/${id}/lock`, {}, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  listTaxConfigurations: async (
    params: ListTaxConfigurationParams,
  ): Promise<ApiResponse<TaxConfiguration[]>> => {
    const response = await apiClient.get<ApiResponse<TaxConfiguration[]>>("/finance/taxes", {
      params,
    });
    return response.data;
  },

  createTaxConfiguration: async (
    data: CreateTaxConfigurationInput,
  ): Promise<ApiResponse<TaxConfiguration>> => {
    const response = await apiClient.post<ApiResponse<TaxConfiguration>>("/finance/taxes", data);
    return response.data;
  },

  updateTaxConfiguration: async (
    id: string,
    companyId: string,
    data: UpdateTaxConfigurationInput,
  ): Promise<ApiResponse<TaxConfiguration>> => {
    const response = await apiClient.put<ApiResponse<TaxConfiguration>>(`/finance/taxes/${id}`, data, {
      params: { company_id: companyId },
    });
    return response.data;
  },

  toggleTaxConfigurationStatus: async (
    id: string,
    companyId: string,
    isActive: boolean,
  ): Promise<ApiResponse<TaxConfiguration>> => {
    const response = await apiClient.patch<ApiResponse<TaxConfiguration>>(
      `/finance/taxes/${id}/toggle-status`,
      {
        company_id: companyId,
        is_active: isActive,
      },
    );
    return response.data;
  },

  getInventorySettings: async (companyId: string): Promise<ApiResponse<InventorySettings>> => {
    const response = await apiClient.get<ApiResponse<InventorySettings>>("/finance/inventory-settings", {
      params: { company_id: companyId },
    });
    return response.data;
  },

  updateInventorySettings: async (
    payload: UpdateInventorySettingsInput,
  ): Promise<ApiResponse<InventorySettings>> => {
    const response = await apiClient.put<ApiResponse<InventorySettings>>(
      "/finance/inventory-settings",
      payload,
    );
    return response.data;
  },

  getAverageCost: async (companyId: string, productId: string): Promise<ApiResponse<InventoryAverageCost>> => {
    const response = await apiClient.get<ApiResponse<InventoryAverageCost>>(
      `/finance/inventory-settings/avg-cost/${productId}`,
      {
        params: { company_id: companyId },
      },
    );
    return response.data;
  },

  getOpeningBalance: async (companyId: string, fiscalYearId: string) => {
    const response = await apiClient.get<ApiResponse<unknown[]>>("/finance/opening-balance", {
      params: {
        company_id: companyId,
        fiscal_year_id: fiscalYearId,
      },
    });
    return response.data;
  },

  upsertOpeningBalance: async (payload: UpsertOpeningBalanceInput): Promise<ApiResponse<{ saved: boolean }>> => {
    const response = await apiClient.put<ApiResponse<{ saved: boolean }>>(
      "/finance/opening-balance",
      payload,
    );
    return response.data;
  },

  validateOpeningBalance: async (companyId: string, fiscalYearId: string): Promise<ApiResponse<OpeningBalanceValidation>> => {
    const response = await apiClient.post<ApiResponse<OpeningBalanceValidation>>(
      "/finance/opening-balance/validate",
      {
        company_id: companyId,
        fiscal_year_id: fiscalYearId,
      },
    );
    return response.data;
  },

  simulateOpeningBalance: async (companyId: string, fiscalYearId: string): Promise<ApiResponse<OpeningBalanceSimulation>> => {
    const response = await apiClient.post<ApiResponse<OpeningBalanceSimulation>>(
      "/finance/opening-balance/simulate",
      {
        company_id: companyId,
        fiscal_year_id: fiscalYearId,
      },
    );
    return response.data;
  },

  postOpeningBalance: async (payload: PostOpeningBalanceInput): Promise<ApiResponse<PostOpeningBalanceResult>> => {
    const response = await apiClient.post<ApiResponse<PostOpeningBalanceResult>>(
      "/finance/opening-balance/post",
      payload,
    );
    return response.data;
  },

  getOpeningBalanceSummary: async (
    companyId: string,
    fiscalYearId: string,
  ): Promise<ApiResponse<OpeningBalanceSummary>> => {
    const response = await apiClient.get<ApiResponse<OpeningBalanceSummary>>("/finance/opening-balance/summary", {
      params: {
        company_id: companyId,
        fiscal_year_id: fiscalYearId,
      },
    });
    return response.data;
  },
};
