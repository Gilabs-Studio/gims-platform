import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  BatchDepreciationPreviewResponse,
  BatchDepreciationRunResponse,
  DepreciationScheduleResponse,
  DepreciationHistoryResponse,
  RunDepreciationRequest,
  DisposalPreviewResponse,
  DisposalRequest,
  RevaluationRequest,
  RevaluationTransaction,
  AssetForTransaction,
} from "../types";

const BASE_URL = "/finance/assets";
const DEPRECIATION_BASE_URL = "/finance/depreciation";

export const fixedAssetsService = {
  // Batch Depreciation
  previewBatchDepreciation: async (month: number, year: number): Promise<ApiResponse<BatchDepreciationPreviewResponse>> => {
    const response = await apiClient.post<ApiResponse<BatchDepreciationPreviewResponse>>(
      `${BASE_URL}/depreciations/preview`,
      { period_month: month, period_year: year }
    );
    return response.data;
  },

  runBatchDepreciation: async (month: number, year: number): Promise<ApiResponse<BatchDepreciationRunResponse>> => {
    const response = await apiClient.post<ApiResponse<BatchDepreciationRunResponse>>(
      `${BASE_URL}/depreciations/run`,
      { period_month: month, period_year: year }
    );
    return response.data;
  },

  // Depreciation Schedule & History
  getDepreciationSchedule: async (params: RunDepreciationRequest): Promise<ApiResponse<DepreciationScheduleResponse>> => {
    const response = await apiClient.get<ApiResponse<DepreciationScheduleResponse>>(
      `${DEPRECIATION_BASE_URL}/schedule`,
      { params }
    );
    return response.data;
  },

  getDepreciationHistory: async (period: string): Promise<ApiResponse<DepreciationHistoryResponse>> => {
    const response = await apiClient.get<ApiResponse<DepreciationHistoryResponse>>(
      `${DEPRECIATION_BASE_URL}/history`,
      { params: { period } }
    );
    return response.data;
  },

  runDepreciation: async (data: RunDepreciationRequest): Promise<ApiResponse<BatchDepreciationRunResponse>> => {
    const response = await apiClient.post<ApiResponse<BatchDepreciationRunResponse>>(
      `${DEPRECIATION_BASE_URL}/run`,
      data
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

  confirmDisposal: async (assetId: string, data: DisposalRequest): Promise<ApiResponse<unknown>> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `${BASE_URL}/${assetId}/dispose`,
      data
    );
    return response.data;
  },

  // Revaluation
  submitRevaluation: async (assetId: string, data: RevaluationRequest): Promise<ApiResponse<unknown>> => {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `${BASE_URL}/${assetId}/revalue`,
      {
        new_value: data.new_value,
        revaluation_date: data.revaluation_date,
        description: data.description,
      }
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
