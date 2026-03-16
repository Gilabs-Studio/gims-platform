import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  CreateJournalEntryInput,
  JournalEntry,
  ListJournalEntriesParams,
  TrialBalanceResponse,
  UpdateJournalEntryInput,
} from "../types";

const BASE_URL = "/finance/journal-entries";

export const financeJournalsService = {
  list: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      BASE_URL,
      { params },
    );
    return response.data;
  },

  listSales: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      `${BASE_URL}/sales`,
      { params },
    );
    return response.data;
  },

  listPurchase: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      `${BASE_URL}/purchase`,
      { params },
    );
    return response.data;
  },

  listAdjustment: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      `${BASE_URL}/adjustment`,
      { params },
    );
    return response.data;
  },

  listValuation: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      `${BASE_URL}/valuation`,
      { params },
    );
    return response.data;
  },

  listCashBank: async (
    params?: ListJournalEntriesParams,
  ): Promise<ApiResponse<JournalEntry[]>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry[]>>(
      `${BASE_URL}/cash-bank`,
      { params },
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<JournalEntry>> => {
    const response = await apiClient.get<ApiResponse<JournalEntry>>(
      `${BASE_URL}/${id}`,
    );
    return response.data;
  },

  create: async (
    data: CreateJournalEntryInput,
  ): Promise<ApiResponse<JournalEntry>> => {
    const response = await apiClient.post<ApiResponse<JournalEntry>>(
      BASE_URL,
      data,
    );
    return response.data;
  },

  update: async (
    id: string,
    data: UpdateJournalEntryInput,
  ): Promise<ApiResponse<JournalEntry>> => {
    const response = await apiClient.put<ApiResponse<JournalEntry>>(
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

  post: async (id: string): Promise<ApiResponse<JournalEntry>> => {
    const response = await apiClient.post<ApiResponse<JournalEntry>>(
      `${BASE_URL}/${id}/post`,
    );
    return response.data;
  },

  reverse: async (id: string): Promise<ApiResponse<JournalEntry>> => {
    const response = await apiClient.post<ApiResponse<JournalEntry>>(
      `${BASE_URL}/${id}/reverse`,
    );
    return response.data;
  },

  trialBalance: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<TrialBalanceResponse>> => {
    const response = await apiClient.get<ApiResponse<TrialBalanceResponse>>(
      `/finance/reports/trial-balance`,
      {
        params,
      },
    );
    return response.data;
  },
};
