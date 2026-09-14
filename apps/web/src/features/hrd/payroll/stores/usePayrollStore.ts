import { create } from "zustand";
import type { PayrollRunRecord, PayrollStatus, PayrollSettings, PayrollMetricSummary } from "../types/payroll.types";
import { mockPayrollRuns, mockPayrollSettings, mockPayrollMetrics } from "../services/payroll.service";

interface PayrollUIState {
  isRunModalOpen: boolean;
  isSettingsModalOpen: boolean;
  trendFilterPeriod: string;

  runs: PayrollRunRecord[];
  settings: PayrollSettings;
  metrics: PayrollMetricSummary;
  customStatuses: Record<string, PayrollStatus>;

  openRunModal: () => void;
  closeRunModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  setTrendFilterPeriod: (period: string) => void;

  updateRunStage: (runId: string, newStatus: PayrollStatus) => void;
  addRunRecord: (run: PayrollRunRecord) => void;
  saveSettings: (newSettings: Partial<PayrollSettings>) => void;
}

export const usePayrollStore = create<PayrollUIState>((set) => ({
  isRunModalOpen: false,
  isSettingsModalOpen: false,
  trendFilterPeriod: "this_year",

  runs: mockPayrollRuns,
  settings: mockPayrollSettings,
  metrics: mockPayrollMetrics,
  customStatuses: {},

  openRunModal: () => set({ isRunModalOpen: true }),
  closeRunModal: () => set({ isRunModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  setTrendFilterPeriod: (period) => set({ trendFilterPeriod: period }),

  updateRunStage: (runId, newStatus) =>
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === runId || r.period.toLowerCase() === runId.toLowerCase()
          ? { ...r, status: newStatus }
          : r
      ),
      customStatuses: { ...state.customStatuses, [runId]: newStatus },
    })),

  addRunRecord: (newRun) =>
    set((state) => ({
      runs: [newRun, ...state.runs],
      metrics: {
        ...state.metrics,
        totalPayrollThisMonth: newRun.totalPayroll,
        totalEmployees: newRun.totalEmployees,
        netPay: Math.round(newRun.totalPayroll * 0.898),
      },
    })),

  saveSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
}));
