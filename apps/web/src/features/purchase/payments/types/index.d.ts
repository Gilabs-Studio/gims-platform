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

export interface PurchasePaymentListParams {
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

export type PurchasePaymentStatus = "PENDING" | "CONFIRMED";
export type PurchasePaymentMethod = "BANK" | "CASH";

export interface PurchasePaymentInvoiceSummary {
  id: string;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  status: string;
  notes?: string | null;
}

export interface PurchasePaymentBankAccountSummary {
  id: string;
  name: string;
  account_number: string;
  account_holder: string;
  currency: string;
}

export interface PurchasePaymentListItem {
  id: string;
  invoice?: PurchasePaymentInvoiceSummary | null;
  bank_account?: PurchasePaymentBankAccountSummary | null;
  payment_date: string;
  amount: number;
  method: PurchasePaymentMethod;
  status: PurchasePaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface PurchasePaymentDetail extends PurchasePaymentListItem {
  reference_number?: string | null;
  notes?: string | null;
}

export interface PurchasePaymentAddInvoiceItem {
  id: string;
  purchase_order?: { id: string; code: string } | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: string;
}

export interface PurchasePaymentAddResponse {
  bank_accounts: PurchasePaymentBankAccountSummary[];
  invoices: PurchasePaymentAddInvoiceItem[];
}

export interface CreatePurchasePaymentInput {
  invoice_id: string;
  bank_account_id: string;
  payment_date: string;
  amount: number;
  method: PurchasePaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
}

export interface PurchasePaymentAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface PurchasePaymentAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  metadata: Record<string, unknown>;
  user?: PurchasePaymentAuditTrailUser | null;
  created_at: string;
}
