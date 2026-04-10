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

export interface SalesPaymentListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  method?: string;
  invoice_id?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type SalesPaymentStatus = "PENDING" | "CONFIRMED";
export type SalesPaymentMethod = "BANK" | "CASH";

export interface SalesPaymentInvoiceSummary {
  id: string;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  status: string;
  notes?: string | null;
}

export interface SalesPaymentBankAccountSummary {
  id: string;
  name: string;
  account_number: string;
  account_holder: string;
  currency: string;
}

export interface SalesPaymentListItem {
  id: string;
  invoice?: SalesPaymentInvoiceSummary | null;
  bank_account?: SalesPaymentBankAccountSummary | null;
  payment_date: string;
  amount: number;
  tender_amount?: number | null;
  change_amount?: number | null;
  method: SalesPaymentMethod;
  status: SalesPaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface SalesPaymentDetail extends SalesPaymentListItem {
  reference_number?: string | null;
  notes?: string | null;
  created_by?: string;
  updated_by?: string;
}

export interface SalesPaymentAddInvoiceItem {
  id: string;
  sales_order?: { id: string; code: string } | null;
  code: string;
  invoice_number?: string | null;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
}

export interface SalesPaymentAddResponse {
  bank_accounts: SalesPaymentBankAccountSummary[];
  invoices: SalesPaymentAddInvoiceItem[];
}

export interface CreateSalesPaymentInput {
  invoice_id?: string | null;
  dp_id?: string | null;
  bank_account_id?: string | null;
  payment_date: string;
  amount?: number;
  method: SalesPaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
}

export interface SalesPaymentAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface SalesPaymentAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  metadata: Record<string, unknown>;
  user?: SalesPaymentAuditTrailUser | null;
  created_at: string;
}
