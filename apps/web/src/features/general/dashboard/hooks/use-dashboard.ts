import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";
import { useDashboardStore } from "../stores/useDashboardStore";
import type { DashboardOverviewData, WidgetConfig } from "../types";

export function useDashboard() {
  const dateFilter = useDashboardStore((s) => s.dateFilter);

  return useQuery<DashboardOverviewData>({
    queryKey: ["dashboard", "overview", dateFilter],
    queryFn: () => dashboardService.getOverview(dateFilter),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches the user's saved dashboard layout from the database.
 * The caller (DashboardGrid) should use useEffect to sync the result into the store.
 * Returns null if the user has no saved layout yet (first-time user → use DEFAULT_WIDGETS).
 */
export function useDashboardLayout() {
  return useQuery<WidgetConfig[] | null>({
    queryKey: ["dashboard", "layout"],
    queryFn: () => dashboardService.getLayout(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/** Mutation to save the current layout to the database. */
export function useSaveLayout() {
  return useMutation<void, Error, WidgetConfig[]>({
    mutationFn: (widgets) => dashboardService.saveLayout(widgets),
  });
}
