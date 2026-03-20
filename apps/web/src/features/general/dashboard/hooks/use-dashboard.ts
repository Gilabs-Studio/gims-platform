import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";
import { useDashboardStore } from "../stores/useDashboardStore";
import type { DashboardOverviewData, DashboardOverviewScope, WidgetConfig, WidgetType } from "../types";

const OVERVIEW_WIDGET_SCOPES: Partial<Record<WidgetType, DashboardOverviewScope>> = {
  total_revenue: "kpi",
  total_orders: "kpi",
  total_customers: "kpi",
  total_products: "kpi",
  employee_count: "kpi",
  stat_summary_revenue: "kpi",
  stat_summary_orders: "kpi",

  revenue_chart: "charts",
  costs_chart: "charts",
  revenue_vs_costs: "charts",
  revenue_bar_chart: "charts",

  balance_overview: "balance",
  stat_summary_balance: "balance",

  costs_by_category: "costs",
  stat_summary_expense: "costs",

  invoices_summary: "invoices",
  recent_invoices: "invoices",

  sales_performance: "sales-performance",
  best_selling: "products",
  delivery_status: "delivery",
  geographic_overview: "geo",
  warehouse_overview: "warehouse",
};

function getOverviewScope(widgetType: WidgetType): DashboardOverviewScope | null {
  return OVERVIEW_WIDGET_SCOPES[widgetType] ?? null;
}

export function isOverviewWidget(widgetType: WidgetType): boolean {
  return getOverviewScope(widgetType) !== null;
}

export function useDashboard() {
  const dateFilter = useDashboardStore((s) => s.dateFilter);

  return useQuery<DashboardOverviewData>({
    queryKey: ["dashboard", "overview", dateFilter],
    queryFn: () => dashboardService.getOverview(dateFilter),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDashboardWidgetOverview(
  widgetType: WidgetType,
  options?: { enabled?: boolean },
) {
  const dateFilter = useDashboardStore((s) => s.dateFilter);
  const scope = getOverviewScope(widgetType);

  return useQuery<Partial<DashboardOverviewData>>({
    queryKey: ["dashboard", "overview-scope", scope ?? "none", dateFilter],
    queryFn: () => dashboardService.getOverviewScope(scope ?? "kpi", dateFilter),
    enabled: (options?.enabled ?? true) && scope !== null,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
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
