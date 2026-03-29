"use client";

import { useQuery } from "@tanstack/react-query";
import { metricsService } from "../services/metrics-service";

interface UseEmployeeMetricsParams {
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export function useEmployeeMetrics(params?: UseEmployeeMetricsParams) {
  return useQuery({
    queryKey: ["settings", "metrics", params],
    queryFn: () =>
      metricsService.getEmployeeDashboardMetrics({
        start_date: params?.startDate,
        end_date: params?.endDate,
      }),
    enabled: params?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
