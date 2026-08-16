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
};

export function usePayroll() {
  const queryClient = useQueryClient();
  const store = usePayrollStore();

  const metricsQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.metrics(),
    queryFn: () => PayrollService.getMetrics(),
  });

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

  const runsQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.runs(),
    queryFn: () => PayrollService.getPayrollRuns(),
  });

  const complianceQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.compliance(),
    queryFn: () => PayrollService.getComplianceTaxes(),
  });

  const settingsQuery = useQuery({
    queryKey: PAYROLL_QUERY_KEYS.settings(),
    queryFn: () => PayrollService.getSettings(),
  });

  const runPayrollMutation = useMutation({
    mutationFn: async (values: PayrollRunFormValues) => {
      // TODO: Replace with actual POST /api/v1/hrd/payroll/run API call
      console.log("Triggering payroll run with values:", values);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_QUERY_KEYS.all });
      store.closeRunModal();
    },
  });

  return {
    // Data states
    metrics: metricsQuery.data,
    isLoadingMetrics: metricsQuery.isLoading,

    trend: trendQuery.data ?? [],
    isLoadingTrend: trendQuery.isLoading,

    components: componentsQuery.data ?? [],
    isLoadingComponents: componentsQuery.isLoading,

    lastRun: lastRunQuery.data,
    isLoadingLastRun: lastRunQuery.isLoading,

    payrollRuns: runsQuery.data ?? [],
    isLoadingRuns: runsQuery.isLoading,

    complianceTaxes: complianceQuery.data ?? [],
    isLoadingCompliance: complianceQuery.isLoading,

    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,

    // Store state & methods
    ...store,

    // Actions
    runPayroll: runPayrollMutation.mutate,
    isSubmittingRun: runPayrollMutation.isPending,
  };
}
