export type PayrollStatus = "Completed" | "In Progress" | "Draft" | "Under Review" | "Approved";

export interface PayrollMetricSummary {
  totalPayrollThisMonth: number;
  totalPayrollChangePct: number;
  totalEmployees: number;
  activeEmployeeDate: string;
  basicSalary: number;
  basicSalaryPct: number;
  allowances: number;
  allowancesPct: number;
  deductions: number;
  deductionsPct: number;
  netPay: number;
  netPayPct: number;
}

export interface PayrollTrendItem {
  period: string;
  totalPayroll: number;
}

export interface PayrollComponentItem {
  name: string;
  key: "basic" | "allowances" | "overtime" | "bonus" | "deductions";
  value: number;
  pct: number;
  color: string;
  [key: string]: unknown;
}

export interface PayrollRunRecord {
  id: string;
  period: string;
  processedDate: string;
  totalEmployees: number;
  totalPayroll: number;
  status: PayrollStatus;
  processedBy: string;
}

export interface ComplianceTaxItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: "pph21" | "bpjs_health" | "bpjs_employment";
}

export interface PayrollSettings {
  cutoffDay: number;
  paymentDay: number;
  enablePph21Ter: boolean;
  bpjsHealthCap: number;
}
