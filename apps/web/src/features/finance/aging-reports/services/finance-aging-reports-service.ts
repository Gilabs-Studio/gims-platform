import { apiClient } from "@/lib/api-client";
import type {
  AgingBucketConfigPayload,
  AgingBucketDefinition,
  AgingReportType,
  AgingQueryParams,
  ApiResponse,
  APAgingReport,
  ARAgingReport,
} from "../types";

export const financeAgingReportsService = {
  ar: async (params?: AgingQueryParams): Promise<ApiResponse<ARAgingReport>> => {
    const response = await apiClient.get<ApiResponse<ARAgingReport>>("/finance/ar/aging", { params });
    return response.data;
  },
  ap: async (params?: AgingQueryParams): Promise<ApiResponse<APAgingReport>> => {
    const response = await apiClient.get<ApiResponse<APAgingReport>>("/finance/ap/aging", { params });
    return response.data;
  },
  getBucketConfig: async (reportType: AgingReportType): Promise<ApiResponse<{ buckets: AgingBucketDefinition[] }>> => {
    const response = await apiClient.get<ApiResponse<{ buckets: AgingBucketDefinition[] }>>("/finance/settings/aging-buckets", {
      params: { report_type: reportType },
    });
    return response.data;
  },
  updateBucketConfig: async (
    payload: AgingBucketConfigPayload,
  ): Promise<ApiResponse<{ buckets: AgingBucketDefinition[] }>> => {
    const response = await apiClient.put<ApiResponse<{ buckets: AgingBucketDefinition[] }>>(
      "/finance/settings/aging-buckets",
      payload,
    );
    return response.data;
  },
};
