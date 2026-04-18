export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number | null;
  prev_page?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: { field: string; order: string };
  };
  error?: string;
}

export type BankReconciliationStatus = "in_progress" | "reconciled" | "locked";
export type BankStatementLineStatus = "unmatched" | "auto_matched" | "manual_matched" | "excluded";
export type BankStatementDirection = "debit" | "credit";

export interface BankStatementLine {
  id: string;
  date: string;
  reference: string;
  description: string;
  amount: number;
  direction: BankStatementDirection;
  status: BankStatementLineStatus;
  matched_with_transaction_id?: string | null;
  exclude_reason?: string;
}

export interface BankReconciliation {
  id: string;
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  difference: number;
  file_format: "csv" | "mt940" | "ofx";
  file_name: string;
  status: BankReconciliationStatus;
  reconciled_by?: string | null;
  locked_by?: string | null;
  reconciled_at?: string | null;
  locked_at?: string | null;
  bank_statement_lines?: BankStatementLine[];
  created_at: string;
  updated_at: string;
}

export interface BankReconciliationFormData {
  bank_accounts: Array<{
    id: string;
    code: string;
    name: string;
    last_reconciliation_date?: string | null;
  }>;
  file_formats: Array<{ value: "csv" | "mt940" | "ofx"; label: string }>;
}

export interface AutoMatchResult {
  reconciliation_id: string;
  status: BankReconciliationStatus;
  auto_matched_count: number;
  manual_match_required_count: number;
  unmatched_count: number;
  bank_statement_lines: BankStatementLine[];
}

export interface ListBankReconciliationParams {
  page?: number;
  per_page?: number;
  company_id?: string;
  bank_account_id?: string;
  status?: BankReconciliationStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ImportBankStatementInput {
  company_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance?: number;
  file_format: "csv" | "mt940" | "ofx";
  file: File;
}

export interface MatchStatementLineInput {
  cash_bank_transaction_id?: string;
}

export interface ExcludeStatementLineInput {
  reason: string;
}
