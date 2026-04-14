import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  BankTransfer,
  CancelBankTransferInput,
  CreateBankTransferInput,
  ListBankTransfersParams,
} from "../types";

const BASE_URL = "/finance/bank-transfers";

function normalizeListParams(params?: ListBankTransfersParams): ListBankTransfersParams | undefined {
  if (!params) return undefined;
  return {
    ...params,
    search: params.search?.trim() || undefined,
  };
}

export const bankTransferService = {
  list: async (params?: ListBankTransfersParams): Promise<ApiResponse<BankTransfer[]>> => {
    const response = await apiClient.get<ApiResponse<BankTransfer[]>>(BASE_URL, {
      params: normalizeListParams(params),
    });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<BankTransfer>> => {
    const response = await apiClient.get<ApiResponse<BankTransfer>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: CreateBankTransferInput): Promise<ApiResponse<BankTransfer>> => {
    const response = await apiClient.post<ApiResponse<BankTransfer>>(BASE_URL, data);
    return response.data;
  },

  complete: async (id: string): Promise<ApiResponse<BankTransfer>> => {
    const response = await apiClient.post<ApiResponse<BankTransfer>>(`${BASE_URL}/${id}/complete`);
    return response.data;
  },

  cancel: async (id: string, data: CancelBankTransferInput): Promise<ApiResponse<BankTransfer>> => {
    const response = await apiClient.post<ApiResponse<BankTransfer>>(`${BASE_URL}/${id}/cancel`, data);
    return response.data;
  },
};
