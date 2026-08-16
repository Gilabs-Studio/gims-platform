import type {
  PayrollMetricSummary,
  PayrollTrendItem,
  PayrollComponentItem,
  PayrollRunRecord,
  ComplianceTaxItem,
  PayrollSettings,
} from "../types/payroll.types";

export const mockPayrollMetrics: PayrollMetricSummary = {
  totalPayrollThisMonth: 1256780000,
  totalPayrollChangePct: 8.2,
  totalEmployees: 245,
  activeEmployeeDate: "1 Jun 2026",
  basicSalary: 895450000,
  basicSalaryPct: 71.2,
  allowances: 189230000,
  allowancesPct: 15.1,
  deductions: 128100000,
  deductionsPct: 10.2,
  netPay: 1128680000,
  netPayPct: 89.8,
};

export const mockPayrollTrend: PayrollTrendItem[] = [
  { period: "Jan 2026", totalPayroll: 980000000 },
  { period: "Feb 2026", totalPayroll: 1040000000 },
  { period: "Mar 2026", totalPayroll: 1045230000 },
  { period: "Apr 2026", totalPayroll: 1098670000 },
  { period: "Mei 2026", totalPayroll: 1163245000 },
  { period: "Jun 2026", totalPayroll: 1256780000 },
];

export const mockPayrollComponents: PayrollComponentItem[] = [
  { name: "Gaji Pokok", key: "basic", value: 895450000, pct: 71.2, color: "#2563eb" },
  { name: "Tunjangan", key: "allowances", value: 189230000, pct: 15.1, color: "#10b981" },
  { name: "Lembur", key: "overtime", value: 72650000, pct: 5.8, color: "#f59e0b" },
  { name: "Bonus / Insentif", key: "bonus", value: 48100000, pct: 3.8, color: "#8b5cf6" },
  { name: "Potongan", key: "deductions", value: 128100000, pct: 10.2, color: "#ef4444" },
];

export const mockLastPayrollRun: PayrollRunRecord = {
  id: "pr-002",
  period: "Mei 2026",
  processedDate: "31 Mei 2026, 14:32",
  totalEmployees: 243,
  totalPayroll: 1163245000,
  status: "Completed",
  processedBy: "Admin User",
};

export const mockPayrollRuns: PayrollRunRecord[] = [
  {
    id: "pr-001",
    period: "Jun 2026",
    processedDate: "30 Jun 2026, 10:15",
    totalEmployees: 245,
    totalPayroll: 1256780000,
    status: "In Progress",
    processedBy: "Admin User",
  },
  {
    id: "pr-002",
    period: "Mei 2026",
    processedDate: "31 Mei 2026, 14:32",
    totalEmployees: 243,
    totalPayroll: 1163245000,
    status: "Completed",
    processedBy: "Admin User",
  },
  {
    id: "pr-003",
    period: "Apr 2026",
    processedDate: "30 Apr 2026, 13:08",
    totalEmployees: 240,
    totalPayroll: 1098670000,
    status: "Completed",
    processedBy: "Admin User",
  },
  {
    id: "pr-004",
    period: "Mar 2026",
    processedDate: "31 Mar 2026, 11:45",
    totalEmployees: 238,
    totalPayroll: 1045230000,
    status: "Completed",
    processedBy: "Admin User",
  },
];

export const mockComplianceTaxList: ComplianceTaxItem[] = [
  {
    id: "tax-01",
    title: "PPh 21 Bulan Ini",
    subtitle: "Total kewajiban pajak",
    amount: 126450000,
    type: "pph21",
  },
  {
    id: "tax-02",
    title: "BPJS Kesehatan",
    subtitle: "Iuran perusahaan & karyawan",
    amount: 45230000,
    type: "bpjs_health",
  },
  {
    id: "tax-03",
    title: "BPJS Ketenagakerjaan",
    subtitle: "Iuran perusahaan & karyawan",
    amount: 67890000,
    type: "bpjs_employment",
  },
];

export const mockPayrollSettings: PayrollSettings = {
  cutoffDay: 25,
  paymentDay: 28,
  enablePph21Ter: true,
  bpjsHealthCap: 12000000,
};

export class PayrollService {
  static async getMetrics(): Promise<PayrollMetricSummary> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/metrics
    return mockPayrollMetrics;
  }

  static async getTrend(): Promise<PayrollTrendItem[]> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/trend
    return mockPayrollTrend;
  }

  static async getComponents(): Promise<PayrollComponentItem[]> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/components
    return mockPayrollComponents;
  }

  static async getLastRun(): Promise<PayrollRunRecord> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/last-run
    return mockLastPayrollRun;
  }

  static async getPayrollRuns(): Promise<PayrollRunRecord[]> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/runs
    return mockPayrollRuns;
  }

  static async getComplianceTaxes(): Promise<ComplianceTaxItem[]> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/compliance
    return mockComplianceTaxList;
  }

  static async getSettings(): Promise<PayrollSettings> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/settings
    return mockPayrollSettings;
  }
}
