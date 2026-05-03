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

export interface AgingBuckets {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  dynamic?: Record<string, number>;
}

export interface AgingBucketDefinition {
  key: string;
  label: string;
  min_days?: number;
  max_days?: number;
}

export interface AgingTotals {
  count: number;
  remaining: number;
  buckets: AgingBuckets;
}

export interface AgingSummary {
  partner_count: number;
  invoice_count: number;
  total_outstanding: number;
  total_overdue: number;
  total_current: number;
  buckets: AgingBuckets;
}

export interface ARAgingInvoiceRow {
  invoice_id: string;
  source_type?: string;
  code: string;
  invoice_number?: string | null;
  customer_id?: string;
  customer_name?: string;
  invoice_date: string;
  due_date: string;
  days_past_due: number;
  amount: number;
  remaining_amount: number;
  buckets: AgingBuckets;
}

export interface APAgingInvoiceRow {
  invoice_id: string;
  source_type?: string;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  days_past_due: number;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  buckets: AgingBuckets;
}

export interface ARAgingCustomerGroup {
  customer_id?: string;
  customer_name: string;
  invoice_count: number;
  total_outstanding: number;
  buckets: AgingBuckets;
  invoices: ARAgingInvoiceRow[];
}

export interface APAgingSupplierGroup {
  supplier_id?: string;
  supplier_name: string;
  invoice_count: number;
  total_outstanding: number;
  buckets: AgingBuckets;
  invoices: APAgingInvoiceRow[];
}

export interface ARAgingReport {
  as_of_date: string;
  bucket_config?: AgingBucketDefinition[];
  rows: ARAgingInvoiceRow[];
  totals: AgingTotals;
  summary?: AgingSummary;
  customers?: ARAgingCustomerGroup[];
}

export interface APAgingReport {
  as_of_date: string;
  bucket_config?: AgingBucketDefinition[];
  rows: APAgingInvoiceRow[];
  totals: AgingTotals;
  summary?: AgingSummary;
  suppliers?: APAgingSupplierGroup[];
}

export interface AgingQueryParams {
  as_of_date?: string;
  search?: string;
  include_current?: boolean;
  min_amount?: number;
  customer_id?: string;
  supplier_id?: string;
}

export interface AgingBucketConfigPayload {
  report_type: "ar" | "ap";
  buckets: AgingBucketDefinition[];
}

export type AgingReportType = "ar" | "ap";
