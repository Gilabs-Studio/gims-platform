import type {
  PayrollMetricSummary,
  PayrollTrendItem,
  PayrollComponentItem,
  PayrollRunRecord,
  ComplianceTaxItem,
  PayrollSettings,
  EmployeePayslipItem,
  PayrollAuditLog,
  PayrollBankTransferBatch,
  PayrollRunDetail,
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

export const mockPayrollTrendThisYear: PayrollTrendItem[] = [
  { period: "Jan 2026", totalPayroll: 980000000 },
  { period: "Feb 2026", totalPayroll: 1040000000 },
  { period: "Mar 2026", totalPayroll: 1045230000 },
  { period: "Apr 2026", totalPayroll: 1098670000 },
  { period: "Mei 2026", totalPayroll: 1163245000 },
  { period: "Jun 2026", totalPayroll: 1256780000 },
  { period: "Jul 2026", totalPayroll: 1285000000 },
  { period: "Ags 2026", totalPayroll: 1310000000 },
  { period: "Sep 2026", totalPayroll: 0 },
  { period: "Okt 2026", totalPayroll: 0 },
  { period: "Nov 2026", totalPayroll: 0 },
  { period: "Des 2026", totalPayroll: 0 },
];

export const mockPayrollTrend12Months: PayrollTrendItem[] = [
  { period: "Sep 2025", totalPayroll: 850000000 },
  { period: "Okt 2025", totalPayroll: 875000000 },
  { period: "Nov 2025", totalPayroll: 910000000 },
  { period: "Des 2025", totalPayroll: 950000000 },
  { period: "Jan 2026", totalPayroll: 980000000 },
  { period: "Feb 2026", totalPayroll: 1040000000 },
  { period: "Mar 2026", totalPayroll: 1045230000 },
  { period: "Apr 2026", totalPayroll: 1098670000 },
  { period: "Mei 2026", totalPayroll: 1163245000 },
  { period: "Jun 2026", totalPayroll: 1256780000 },
  { period: "Jul 2026", totalPayroll: 1285000000 },
  { period: "Ags 2026", totalPayroll: 1310000000 },
];

export const mockPayrollTrend6Months: PayrollTrendItem[] = [
  { period: "Mar 2026", totalPayroll: 1045230000 },
  { period: "Apr 2026", totalPayroll: 1098670000 },
  { period: "Mei 2026", totalPayroll: 1163245000 },
  { period: "Jun 2026", totalPayroll: 1256780000 },
  { period: "Jul 2026", totalPayroll: 1285000000 },
  { period: "Ags 2026", totalPayroll: 1310000000 },
];

export const mockPayrollTrend = mockPayrollTrendThisYear;

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

export const mockEmployeePayslips: EmployeePayslipItem[] = [
  {
    id: "slip-001",
    employeeId: "emp-001",
    employeeName: "Budi Santoso",
    nip: "EMP-2024-001",
    department: "Technology",
    position: "Senior Software Engineer",
    basicSalary: 18500000,
    allowances: 4200000,
    overtime: 1500000,
    deductions: 2100000,
    taxPph21: 1450000,
    bpjsEmployee: 650000,
    netPay: 22100000,
    bankName: "Bank Central Asia (BCA)",
    bankAccountNumber: "8492049182",
    status: "Paid",
  },
  {
    id: "slip-002",
    employeeId: "emp-002",
    employeeName: "Dewi Lestari",
    nip: "EMP-2024-002",
    department: "Human Resources",
    position: "HR Operations Manager",
    basicSalary: 16000000,
    allowances: 3500000,
    overtime: 800000,
    deductions: 1800000,
    taxPph21: 1200000,
    bpjsEmployee: 600000,
    netPay: 18500000,
    bankName: "Bank Mandiri",
    bankAccountNumber: "1370019284102",
    status: "Paid",
  },
  {
    id: "slip-003",
    employeeId: "emp-003",
    employeeName: "Ahmad Rizky",
    nip: "EMP-2024-003",
    department: "Product Design",
    position: "Lead UX Designer",
    basicSalary: 14500000,
    allowances: 2800000,
    overtime: 600000,
    deductions: 1500000,
    taxPph21: 980000,
    bpjsEmployee: 520000,
    netPay: 16400000,
    bankName: "Bank Central Asia (BCA)",
    bankAccountNumber: "0829104829",
    status: "Paid",
  },
  {
    id: "slip-004",
    employeeId: "emp-004",
    employeeName: "Siti Rahma",
    nip: "EMP-2024-004",
    department: "Sales & Marketing",
    position: "Senior Account Executive",
    basicSalary: 12000000,
    allowances: 5500000,
    overtime: 2200000,
    deductions: 1400000,
    taxPph21: 950000,
    bpjsEmployee: 450000,
    netPay: 18300000,
    bankName: "Bank Negara Indonesia (BNI)",
    bankAccountNumber: "4920194829",
    status: "Paid",
  },
  {
    id: "slip-005",
    employeeId: "emp-005",
    employeeName: "Kevin Pratama",
    nip: "EMP-2024-005",
    department: "Finance & Accounting",
    position: "Finance Lead",
    basicSalary: 17000000,
    allowances: 3800000,
    overtime: 1000000,
    deductions: 1900000,
    taxPph21: 1300000,
    bpjsEmployee: 600000,
    netPay: 19900000,
    bankName: "Bank Central Asia (BCA)",
    bankAccountNumber: "2948201928",
    status: "Paid",
  },
];

export const mockAuditLogs: PayrollAuditLog[] = [
  {
    id: "audit-01",
    timestamp: "30 Jun 2026, 14:20",
    user: "Dewi Lestari",
    role: "HR Operations",
    action: "Memulai kalkulasi penggajian otomatis untuk 245 karyawan",
    notes: "Pengaturan PPh 21 TER 2024 dan batas BPJS diaktifkan.",
  },
  {
    id: "audit-02",
    timestamp: "30 Jun 2026, 15:10",
    user: "Kevin Pratama",
    role: "Finance Lead",
    action: "Melakukan peninjauan awal & verifikasi komponen lembur",
    notes: "Verifikasi 12 lembur divisi sales disetujui.",
  },
  {
    id: "audit-03",
    timestamp: "30 Jun 2026, 16:45",
    user: "Manager HRD",
    role: "Payroll Approver",
    action: "Persetujuan final penggajian periode Jun 2026",
    notes: "Status disetujui untuk pemrosesan file transfer bank.",
  },
];

export const mockBankBatch: PayrollBankTransferBatch = {
  bankName: "Bank Central Asia (BCA) Corporate Giro",
  accountNumber: "0083920192",
  accountHolder: "PT GILABS DIGITAL NUSANTARA",
  batchReference: "BATCH-PAY-202606-BCA01",
  totalRecords: 245,
  totalAmount: 1256780000,
  status: "Verified",
};

export class PayrollService {
  static async getMetrics(): Promise<PayrollMetricSummary> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/metrics
    return mockPayrollMetrics;
  }

  static async getTrend(periodFilter: string = "this_year"): Promise<PayrollTrendItem[]> {
    // TODO: Replace mock with actual API call GET /api/v1/hrd/payroll/trend?period=...
    if (periodFilter === "6_months") {
      return mockPayrollTrend6Months;
    }
    if (periodFilter === "12_months") {
      return mockPayrollTrend12Months;
    }
    return mockPayrollTrendThisYear;
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

  static async getPayrollRunDetail(id: string): Promise<PayrollRunDetail> {
    // Return matching run or default fallback for mock
    const run = mockPayrollRuns.find((r) => r.id === id || r.period.toLowerCase() === id.toLowerCase()) || {
      id: id,
      period: "Jun 2026",
      processedDate: "30 Jun 2026, 10:15",
      totalEmployees: 245,
      totalPayroll: 1256780000,
      status: "In Progress" as const,
      processedBy: "Admin User",
    };

    return {
      ...run,
      cutoffPeriod: "26 Mei 2026 - 25 Jun 2026",
      paymentDate: "28 Jun 2026",
      notes: "Penggajian rutin bulanan periode " + run.period + " mencakup 245 karyawan aktif dengan kalkulasi PPh 21 TER 2024.",
      grossPayroll: 1384880000,
      totalTax: 126450000,
      totalBpjsCompany: 67890000,
      totalBpjsEmployee: 45230000,
      netPayroll: run.totalPayroll,
      reviewedBy: "Kevin Pratama (Finance)",
      reviewedAt: "30 Jun 2026, 15:10",
      approvedBy: "Dewi Lestari (HR Manager)",
      approvedAt: "30 Jun 2026, 16:45",
      payslips: mockEmployeePayslips,
      auditLogs: mockAuditLogs,
      bankBatch: mockBankBatch,
    };
  }
}

