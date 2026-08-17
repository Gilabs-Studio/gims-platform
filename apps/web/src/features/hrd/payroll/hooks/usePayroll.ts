import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PayrollService } from "../services/payroll.service";
import { usePayrollStore } from "../stores/usePayrollStore";
import type { PayrollRunFormValues } from "../schemas/payroll.schema";

export const PAYROLL_QUERY_KEYS = {
  all: ["payroll"] as const,
  metrics: () => [...PAYROLL_QUERY_KEYS.all, "metrics"] as const,
  trend: () => [...PAYROLL_QUERY_KEYS.all, "trend"] as const,
  components: () => [...PAYROLL_QUERY_KEYS.all, "components"] as const,
  lastRun: () => [...PAYROLL_QUERY_KEYS.all, "lastRun"] as const,
  runs: () => [...PAYROLL_QUERY_KEYS.all, "runs"] as const,
  compliance: () => [...PAYROLL_QUERY_KEYS.all, "compliance"] as const,
  settings: () => [...PAYROLL_QUERY_KEYS.all, "settings"] as const,
  detail: (id: string) => [...PAYROLL_QUERY_KEYS.all, "detail", id] as const,
};

export function usePayrollRunDetail(id: string) {
  const customStatus = usePayrollStore((s) => s.customStatuses[id]);

  const detailQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.detail(id),
    queryFn: () => PayrollService.getPayrollRunDetail(id),
    enabled: !!id,
  });

  const detail = detailQuery.data
    ? {
        ...detailQuery.data,
        status: customStatus ?? detailQuery.data.status,
      }
    : undefined;

  return {
    detail,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}

export function usePayroll() {
  const queryClient = useQueryClient();
  const store = usePayrollStore();

  const trendQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.trend(),
    queryFn: () => PayrollService.getTrend(),
  });

  const componentsQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.components(),
    queryFn: () => PayrollService.getComponents(),
  });

  const lastRunQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.lastRun(),
    queryFn: () => PayrollService.getLastRun(),
  });

  const complianceQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.compliance(),
    queryFn: () => PayrollService.getComplianceTaxes(),
  });

  const runPayrollMutation = useMutation({
    mutationFn: async (values: PayrollRunFormValues) => {
      // Simulate adding a new payroll run record in state
      const newRunId = `pr-00${store.runs.length + 1}`;
      store.addRunRecord({
        id: newRunId,
        period: values.period ?? "Jul 2026",
        processedDate: "Hari ini, 12:00",
        totalEmployees: 245,
        totalPayroll: 1285000000,
        status: "In Progress",
        processedBy: "Admin User",
      });
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEYS.all });
      store.closeRunModal();
    },
  });

  return {
    // Store state & methods
    ...store,

    // Data & Query states
    isLoadingMetrics: false,

    trend: trendQuery.data ?? [],
    isLoadingTrend: trendQuery.isLoading,

    components: componentsQuery.data ?? [],
    isLoadingComponents: componentsQuery.isLoading,

    lastRun: lastRunQuery.data,
    isLoadingLastRun: lastRunQuery.isLoading,

    complianceTaxes: complianceQuery.data ?? [],
    isLoadingCompliance: complianceQuery.isLoading,

    payrollRuns: store.runs,
    isLoadingRuns: false,
    isLoadingSettings: false,

    // Actions
    runPayroll: runPayrollMutation.mutate,
    isSubmittingRun: runPayrollMutation.isPending,
  };
}
