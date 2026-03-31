import { apiClient } from "@/lib/api-client";
import type { EmployeeDashboardMetricsResponse } from "../types";

interface GetMetricsParams {
  start_date?: string;
  end_date?: string;
}

export const metricsService = {
  /**
   * Get employee dashboard metrics (check-in locations, products sold, customers)
   * Fetches data specific to the current authenticated user
   */
  async getEmployeeDashboardMetrics(
    params?: GetMetricsParams
  ): Promise<EmployeeDashboardMetricsResponse> {
    const response = await apiClient.get<EmployeeDashboardMetricsResponse>(
      "/reports/sales-overview/profile-metrics",
      { params }
    );
    return response.data;
  },
};
