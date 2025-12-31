import apiClient from "@/lib/api-client";
import type {
  StockValuationListResponse,
  StockValuationStatsResponse,
  StockValuationTimelineResponse,
} from "../types";

export const stockValuationService = {
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    searchBy?: string;
    movement_type?: "IN" | "OUT";
    reference_type?: "PO" | "SO" | "ADJUSTMENT" | "TRANSFER" | "RETURN";
    product_id?: number;
    warehouse_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<StockValuationListResponse> {
    const response = await apiClient.get<StockValuationListResponse>(
      "/stock/stock-valuations",
      {
        params,
      }
    );
    return response.data;
  },

  async getStats(params?: {
    start_date?: string;
    end_date?: string;
    product_id?: number;
    warehouse_id?: number;
  }): Promise<StockValuationStatsResponse> {
    const response = await apiClient.get<StockValuationStatsResponse>(
      "/stock/stock-valuations/stats",
      {
        params,
      }
    );
    return response.data;
  },

  async getTimeline(params?: {
    start_date?: string;
    end_date?: string;
    product_id?: number;
    warehouse_id?: number;
    group_by?: "daily" | "weekly" | "monthly";
  }): Promise<StockValuationTimelineResponse> {
    const response = await apiClient.get<StockValuationTimelineResponse>(
      "/stock/stock-valuations/stats/timeline",
      {
        params,
      }
    );
    return response.data;
  },
};
