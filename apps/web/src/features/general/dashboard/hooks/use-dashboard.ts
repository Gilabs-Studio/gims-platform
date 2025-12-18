import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";
import type { DashboardOverview } from "../types";

export function useDashboard() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const response = await dashboardService.getOverview();
      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

