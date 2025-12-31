"use client";

import { useQuery } from "@tanstack/react-query";
import { stockValuationService } from "../services/stock-valuation-service";

export function useStockValuations(params?: {
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
}) {
  return useQuery({
    queryKey: ["stock-valuations", params],
    queryFn: () => stockValuationService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockValuationStats(params?: {
  start_date?: string;
  end_date?: string;
  product_id?: number;
  warehouse_id?: number;
}) {
  return useQuery({
    queryKey: ["stock-valuation-stats", params],
    queryFn: () => stockValuationService.getStats(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockValuationTimeline(params?: {
  start_date?: string;
  end_date?: string;
  product_id?: number;
  warehouse_id?: number;
  group_by?: "daily" | "weekly" | "monthly";
}) {
  return useQuery({
    queryKey: ["stock-valuation-timeline", params],
    queryFn: () => stockValuationService.getTimeline(params),
    staleTime: 5 * 60 * 1000,
  });
}
