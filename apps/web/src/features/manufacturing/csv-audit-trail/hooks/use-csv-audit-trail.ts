import { useQuery } from "@tanstack/react-query";
import { csvAuditTrailService } from "../services/csv-audit-trail.service";
import type { AuditTrailFilterParams } from "../types/csv-audit-trail.types";
import { useCsvAuditTrailStore } from "../stores/use-csv-audit-trail-store";

export const CSV_AUDIT_TRAIL_QUERY_KEYS = {
  dashboard: (params?: AuditTrailFilterParams) => ["csv-audit-trail", "dashboard", params] as const,
};

export function useCsvAuditTrailDashboard(params?: AuditTrailFilterParams) {
  return useQuery({
    queryKey: CSV_AUDIT_TRAIL_QUERY_KEYS.dashboard(params),
    queryFn: () => csvAuditTrailService.getDashboardData(params),
    staleTime: 30 * 1000,
  });
}

export function useCsvAuditTrail() {
  const store = useCsvAuditTrailStore();

  const queryParams: AuditTrailFilterParams = {
    page: store.page,
    search: store.searchQuery.trim() || undefined,
    module: store.selectedModule !== "all" ? store.selectedModule : undefined,
    action: store.selectedAction !== "all" ? store.selectedAction : undefined,
  };

  const query = useCsvAuditTrailDashboard(queryParams);

  return {
    ...store,
    data: query.data?.records ?? [],
    kpis: query.data?.kpis,
    totalLogs: query.data?.totalLogs ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
