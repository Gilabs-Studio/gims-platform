import { create } from "zustand";
import type { PayrollRunRecord } from "../types/payroll.types";

interface PayrollUIState {
  isRunModalOpen: boolean;
  isSettingsModalOpen: boolean;
  selectedRunRecord: PayrollRunRecord | null;
  trendFilterPeriod: string;

  openRunModal: () => void;
  closeRunModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  setSelectedRunRecord: (record: PayrollRunRecord | null) => void;
  setTrendFilterPeriod: (period: string) => void;
}

export const usePayrollStore = create<PayrollUIState>((set) => ({
  isRunModalOpen: false,
  isSettingsModalOpen: false,
  selectedRunRecord: null,
  trendFilterPeriod: "6_months",

  openRunModal: () => set({ isRunModalOpen: true }),
  closeRunModal: () => set({ isRunModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  setSelectedRunRecord: (record) => set({ selectedRunRecord: record }),
  setTrendFilterPeriod: (period) => set({ trendFilterPeriod: period }),
}));
