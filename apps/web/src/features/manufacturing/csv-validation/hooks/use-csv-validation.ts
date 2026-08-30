import { useQuery } from "@tanstack/react-query";
import { csvValidationService } from "../services/csv-validation.service";
import type { AuditLogFilterParams } from "../types/csv-validation.types";
import { useCsvValidationStore } from "../stores/use-csv-validation-store";

export const CSV_VALIDATION_QUERY_KEYS = {
  dashboard: (params?: AuditLogFilterParams) => ["csv-validation", "dashboard", params] as const,
};

export function useSystemValidationDashboard(params?: AuditLogFilterParams) {
  return useQuery({
    queryKey: CSV_VALIDATION_QUERY_KEYS.dashboard(params),
    queryFn: () => csvValidationService.getDashboardData(params),
    staleTime: 30 * 1000,
  });
}

export function useCsvValidation() {
  const store = useCsvValidationStore();

  const queryParams: AuditLogFilterParams = {
    page: store.page,
    search: store.searchQuery.trim() || undefined,
    module: store.selectedModule !== "all" ? store.selectedModule : undefined,
    action: store.selectedAction !== "all" ? store.selectedAction : undefined,
  };

  const query = useSystemValidationDashboard(queryParams);

  return {
    ...store,
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
