import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CashBankFormData,
  CashBankJournal,
  CashBankJournalInput,
  ListCashBankParams,
} from "../types";
import type {
  ListJournalLinesParams,
  ListJournalLinesResponse,
} from "../types";

const BASE_URL = "/finance/cash-bank";

export const financeCashBankService = {
  list: async (
    params?: ListCashBankParams,
  ): Promise<ApiResponse<CashBankJournal[]>> => {
    const response = await apiClient.get<ApiResponse<CashBankJournal[]>>(
      BASE_URL,
      { params },
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<CashBankJournal>> => {
    const response = await apiClient.get<ApiResponse<CashBankJournal>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CashBankJournalInput,
  ): Promise<ApiResponse<CashBankJournal>> => {
    const response = await apiClient.post<ApiResponse<CashBankJournal>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: CashBankJournalInput,
  ): Promise<ApiResponse<CashBankJournal>> => {
    const response = await apiClient.put<ApiResponse<CashBankJournal>>(
      `${BASE_URL}/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  post: async (id: string): Promise<ApiResponse<CashBankJournal>> => {
    const response = await apiClient.post<ApiResponse<CashBankJournal>>(
      `${BASE_URL}/${id}/post`,
    );
    return response.data;
  },

  getFormData: async (): Promise<ApiResponse<CashBankFormData>> => {
    const response = await apiClient.get<ApiResponse<CashBankFormData>>(
      `${BASE_URL}/form-data`,
    );
    return response.data;
  },

  listLines: async (
    id: string,
    params?: ListJournalLinesParams,
  ): Promise<ApiResponse<ListJournalLinesResponse>> => {
    const response = await apiClient.get<ApiResponse<ListJournalLinesResponse>>(
      `${BASE_URL}/${id}/lines`,
      { params },
    );
    return response.data;
  },
};
