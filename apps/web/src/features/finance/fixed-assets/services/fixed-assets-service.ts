import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  BatchDepreciationPreviewResponse,
  BatchDepreciationRunResponse,
  DisposalPreviewResponse,
  DisposalRequest,
  RevaluationRequest,
  RevaluationTransaction,
  AssetForTransaction,
} from "../types";

const BASE_URL = "/finance/assets";

export const fixedAssetsService = {
  // Batch Depreciation
  previewBatchDepreciation: async (month: number, year: number): Promise<ApiResponse<BatchDepreciationPreviewResponse>> => {
    const response = await apiClient.post<ApiResponse<BatchDepreciationPreviewResponse>>(
      `${BASE_URL}/depreciations/preview`,
      { month, year }
    );
    return response.data;
  },

  runBatchDepreciation: async (month: number, year: number): Promise<ApiResponse<BatchDepreciationRunResponse>> => {
    const response = await apiClient.post<ApiResponse<BatchDepreciationRunResponse>>(
      `${BASE_URL}/depreciations/run`,
      { month, year }
    );
    return response.data;
  },

  // Disposal
  previewDisposal: async (assetId: string, proceedsAmount: number, disposalAccountId?: string): Promise<ApiResponse<DisposalPreviewResponse>> => {
    const response = await apiClient.post<ApiResponse<DisposalPreviewResponse>>(
      `${BASE_URL}/${assetId}/disposal-preview`,
      { proceeds_amount: proceedsAmount, disposal_account_id: disposalAccountId }
    );
    return response.data;
  },

  confirmDisposal: async (assetId: string, data: DisposalRequest): Promise<ApiResponse<any>> => {
    const response = await apiClient.post<ApiResponse<any>>(
      `${BASE_URL}/${assetId}/dispose`,
      data
    );
    return response.data;
  },

  // Revaluation
  previewRevaluation: async (assetId: string, revaluationAmount: number): Promise<ApiResponse<DisposalPreviewResponse>> => {
    const response = await apiClient.post<ApiResponse<DisposalPreviewResponse>>(
      `${BASE_URL}/${assetId}/revalue`,
      { revaluation_amount: revaluationAmount }
    );
    return response.data;
  },

  approveRevaluation: async (transactionId: string): Promise<ApiResponse<RevaluationTransaction>> => {
    const response = await apiClient.post<ApiResponse<RevaluationTransaction>>(
      `${BASE_URL}/transactions/${transactionId}/approve`,
      {}
    );
    return response.data;
  },

  // Get assets for transaction
  getAssetsForTransaction: async (): Promise<ApiResponse<AssetForTransaction[]>> => {
    const response = await apiClient.get<ApiResponse<AssetForTransaction[]>>(
      `${BASE_URL}/form-data`
    );
    return response.data;
  },
};
