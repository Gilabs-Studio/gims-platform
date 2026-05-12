import { apiClient } from "@/lib/api-client";
import type { ApiResponse, TransferListItem, TransferListParams } from "../types";

const TRANSFER_BASE = "/finance";

export const transferService = {
  list: async (params?: TransferListParams): Promise<ApiResponse<TransferListItem[]>> => {
    const response = await apiClient.get<ApiResponse<TransferListItem[]>>(`${TRANSFER_BASE}/transfers`, { params });
    return response.data;
  },

  approve: async (transferId: string): Promise<ApiResponse<TransferListItem>> => {
    const response = await apiClient.post<ApiResponse<TransferListItem>>(`${TRANSFER_BASE}/approvals/${transferId}/approve`);
    return response.data;
  },

  reject: async (transferId: string, reason?: string): Promise<ApiResponse<TransferListItem>> => {
    const body = reason ? { reason } : {};
    const response = await apiClient.post<ApiResponse<TransferListItem>>(`${TRANSFER_BASE}/approvals/${transferId}/reject`, body);
    return response.data;
  },
};
