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

export type JournalStatus = "draft" | "posted" | "reversed" | "cancelled";

export type JournalType =
  | "GENERAL"
  | "SALES"
  | "PURCHASE"
  | "INVENTORY"
  | "ADJUSTMENT"
  | "VALUATION"
  | "CASH_BANK"
  | "OPENING_BALANCE"
  | string;

export interface JournalLine {
  id: string;
  chart_of_account_id: string;
  chart_of_account?: { id: string; code: string; name: string } | null;
  debit: number;
  credit: number;
  memo?: string | null;
}

export interface JournalEntry {
  id: string;
  company_id?: string;
  fiscal_year_id?: string | null;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  reference_code?: string | null;
  journal_type?: JournalType | null;
  status: JournalStatus;
  posted_at?: string | null;
  posted_by?: string | null;
  posted_by_name?: string | null;
  posted_by_email?: string | null;
  is_system_generated?: boolean;
  is_valuation?: boolean;
  source?: string;
  valuation_run_id?: string | null;
  lines: JournalLine[];
  debit_total: number;
  credit_total: number;
  currency_code?: string;
  exchange_rate?: number;
  created_by?: string | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversed_by_name?: string | null;
  reversed_by_email?: string | null;
  reversal_reason?: string | null;
  source_document_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListJournalEntriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: JournalStatus;
  journal_type?: string;
  company_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface JournalLineInput {
  chart_of_account_id: string;
  debit?: number;
  credit?: number;
  memo?: string | null;
}

export interface CreateJournalEntryInput {
  company_id: string;
  fiscal_year_id?: string | null;
  entry_date: string;
  reference?: string | null;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  journal_type?: JournalType;
  currency_code?: string;
  exchange_rate?: number;
  lines: JournalLineInput[];
}

export type UpdateJournalEntryInput = CreateJournalEntryInput;

// ===== Valuation Run Types =====

export type ValuationRunStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "posted"
  | "no_difference"
  | "failed";

export type ValuationType = "inventory" | "fx" | "depreciation";

export interface ValuationItem {
  reference_id: string;
  product_id?: string | null;
  qty: number;
  book_value: number;
  actual_value: number;
  delta: number;
  direction: "gain" | "loss";
}

export interface ValuationPreviewJournalLine {
  chart_of_account_id: string;
  debit: number;
  credit: number;
  memo: string;
}

export interface ValuationPreview {
  valuation_type: ValuationType;
  period_start: string;
  period_end: string;
  items: ValuationItem[];
  total_delta: number;
  total_gain: number;
  total_loss: number;
  journal_lines: ValuationPreviewJournalLine[];
  is_balanced: boolean;
}

export interface ValuationRun {
  id: string;
  reference_id: string;
  valuation_type: ValuationType;
  period_start: string;
  period_end: string;
  status: ValuationRunStatus;
  total_debit: number;
  total_credit: number;
  total_delta: number;
  journal_entry_id?: string | null;
  error_message?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  items?: ValuationItem[];
  created_at: string;
  updated_at: string;
}

export interface RunValuationInput {
  valuation_type: ValuationType;
  period_start: string;
  period_end: string;
  reference_id?: string;
}

export interface ApproveValuationInput {
  notes?: string;
}

export interface ValuationKPIMeta {
  total_entries: number;
  total_debit_sum: number;
  total_credit_sum: number;
  completed_runs: number;
  processing_runs: number;
  failed_runs: number;
}

export interface ListValuationRunsParams {
  page?: number;
  per_page?: number;
  valuation_type?: ValuationType;
  status?: ValuationRunStatus;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface ValuationApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    additional?: {
      kpi?: ValuationKPIMeta;
    };
  };
  error?: string;
}

// ===== Cash & Bank Subledger Types =====

export interface CashBankSubLedgerEntry {
  id: string;
  transaction_date: string;
  type: "cash_in" | "cash_out" | "transfer";
  transaction_type: "cash_in" | "cash_out" | "transfer";
  description?: string | null;
  bank_account_id: string;
  reference_type: string;
  reference_id: string;
  reference_code: string;
  bank_account?: {
    id: string;
    name: string;
    account_number: string;
    account_holder: string;
    currency: string;
  } | null;
  total_amount: number;
  status: "posted";
  journal_entry_id?: string | null;
  posted_at?: string | null;
  posted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashBankSubLedgerKPI {
  total_inflow: number;
  total_outflow: number;
  net_movement: number;
  total_records: number;
}

export interface ListCashBankSubLedgerParams {
  page?: number;
  per_page?: number;
  search?: string;
  type?: "cash_in" | "cash_out" | "transfer";
  source?: string;
  bank_account_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface CashBankSubLedgerApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    additional?: {
      kpi?: CashBankSubLedgerKPI;
    };
  };
  error?: string;
}

export interface AdjustmentApprovalActionInput {
  notes?: string;
}

export interface AdjustmentApprovalHistoryItem {
  id: string;
  journal_id: string;
  action: "submitted" | "approved" | "rejected" | string;
  actor_id: string;
  notes?: string | null;
  created_at: string;
}

export interface JournalTemplate {
  id: string;
  company_id: string;
  template_name: string;
  journal_type: JournalType;
  description?: string | null;
  lines: string;
  created_by?: string | null;
  last_used_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListJournalTemplateParams {
  page?: number;
  per_page?: number;
  search?: string;
  company_id?: string;
}

export interface CreateJournalTemplateInput {
  company_id: string;
  template_name: string;
  journal_type: JournalType;
  description?: string | null;
  lines: JournalLineInput[];
}

export interface UseJournalTemplateResponse {
  template: JournalTemplate;
  prefill: CreateJournalEntryInput;
}

// ===== Form Data Types =====

export interface COAFormOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface EnumOption {
  value: string;
  label: string;
}

export interface JournalEntryFormDataResponse {
  chart_of_accounts: COAFormOption[];
  journal_types: EnumOption[];
  reference_types: EnumOption[];
  currencies: EnumOption[];
  statuses: EnumOption[];
}
