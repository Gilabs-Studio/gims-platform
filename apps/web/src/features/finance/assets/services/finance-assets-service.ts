import { apiClient } from "@/lib/api-client";
import type {
  AdjustAssetInput,
  ApiResponse,
  Asset,
  AssetAttachment,
  AssetAttachmentInput,
  AssetAuditLog,
  AssetAssignmentHistory,
  AssetInput,
  AssignAssetInput,
  DepreciateAssetInput,
  DisposeAssetInput,
  ListAssetsParams,
  ReturnAssetInput,
  RevalueAssetInput,
  SellAssetInput,
  TransferAssetInput,
} from "../types";

const BASE_URL = "/finance/assets";

export const financeAssetsService = {
  list: async (params?: ListAssetsParams): Promise<ApiResponse<Asset[]>> => {
    const response = await apiClient.get<ApiResponse<Asset[]>>(BASE_URL, { params });
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.get<ApiResponse<Asset>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  create: async (data: AssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(BASE_URL, data);
    return response.data;
  },

  update: async (id: string, data: AssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.put<ApiResponse<Asset>>(`${BASE_URL}/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${id}`);
    return response.data;
  },

  depreciate: async (id: string, data: DepreciateAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/depreciate`, data);
    return response.data;
  },

  transfer: async (id: string, data: TransferAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/transfer`, data);
    return response.data;
  },

  dispose: async (id: string, data: DisposeAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/dispose`, data);
    return response.data;
  },

  sell: async (id: string, data: SellAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/sell`, data);
    return response.data;
  },

  revalue: async (id: string, data: RevalueAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/revalue`, data);
    return response.data;
  },

  adjust: async (id: string, data: AdjustAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/adjust`, data);
    return response.data;
  },

  approveTransaction: async (txId: string): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/transactions/${txId}/approve`);
    return response.data;
  },

  // Phase 2: Attachments
  listAttachments: async (assetId: string): Promise<ApiResponse<AssetAttachment[]>> => {
    const response = await apiClient.get<ApiResponse<AssetAttachment[]>>(`${BASE_URL}/${assetId}/attachments`);
    return response.data;
  },

  uploadAttachment: async (assetId: string, data: AssetAttachmentInput): Promise<ApiResponse<AssetAttachment>> => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("file_type", data.file_type);
    if (data.description) {
      formData.append("description", data.description);
    }
    const response = await apiClient.post<ApiResponse<AssetAttachment>>(`${BASE_URL}/${assetId}/attachments`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  deleteAttachment: async (assetId: string, attachmentId: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE_URL}/${assetId}/attachments/${attachmentId}`);
    return response.data;
  },

  // Phase 2: Assignments
  assignAsset: async (id: string, data: AssignAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/assign`, data);
    return response.data;
  },

  returnAsset: async (id: string, data: ReturnAssetInput): Promise<ApiResponse<Asset>> => {
    const response = await apiClient.post<ApiResponse<Asset>>(`${BASE_URL}/${id}/return`, data);
    return response.data;
  },

  // Phase 2: Audit Logs & Assignment History
  listAuditLogs: async (assetId: string): Promise<ApiResponse<AssetAuditLog[]>> => {
    const response = await apiClient.get<ApiResponse<AssetAuditLog[]>>(`${BASE_URL}/${assetId}/audit-logs`);
    return response.data;
  },

  listAssignmentHistory: async (assetId: string): Promise<ApiResponse<AssetAssignmentHistory[]>> => {
    const response = await apiClient.get<ApiResponse<AssetAssignmentHistory[]>>(`${BASE_URL}/${assetId}/assignment-history`);
    return response.data;
  },
};
