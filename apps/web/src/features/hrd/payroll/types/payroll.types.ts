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

export interface EmployeePayslipItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  nip: string;
  department: string;
  position: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  taxPph21: number;
  bpjsEmployee: number;
  netPay: number;
  bankName: string;
  bankAccountNumber: string;
  status: "Paid" | "Pending" | "Processing";
}

export interface PayrollAuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  notes?: string;
}

export interface PayrollBankTransferBatch {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  batchReference: string;
  totalRecords: number;
  totalAmount: number;
  status: "Verified" | "Transferred" | "Pending Verification";
}

export interface PayrollRunDetail extends PayrollRunRecord {
  cutoffPeriod: string;
  paymentDate: string;
  notes: string;
  grossPayroll: number;
  totalTax: number;
  totalBpjsCompany: number;
  totalBpjsEmployee: number;
  netPayroll: number;
  approvedBy?: string;
  approvedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  payslips: EmployeePayslipItem[];
  auditLogs: PayrollAuditLog[];
  bankBatch: PayrollBankTransferBatch;
}

