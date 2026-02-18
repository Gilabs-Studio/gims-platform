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

export interface TaxInvoice {
  id: string;
  tax_invoice_number: string;
  tax_invoice_date: string;
  customer_invoice_id?: string | null;
  supplier_invoice_id?: string | null;
  dpp_amount: number;
  vat_amount: number;
  total_amount: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ListTaxInvoicesParams {
  page?: number;
  per_page?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

export interface TaxInvoiceCreateInput {
  tax_invoice_number: string;
  tax_invoice_date: string;
  customer_invoice_id?: string | null;
  supplier_invoice_id?: string | null;
  dpp_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  notes?: string;
}

export interface TaxInvoiceUpdateInput {
  tax_invoice_number: string;
  tax_invoice_date: string;
  dpp_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  notes?: string;
  supplier_invoice_id?: string | null;
}
