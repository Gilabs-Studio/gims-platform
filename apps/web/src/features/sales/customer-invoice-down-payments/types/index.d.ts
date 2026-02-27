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

export interface CustomerInvoiceDPListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type CustomerInvoiceDPStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID";

export interface CustomerInvoiceDPSalesOrderMini {
  id: string;
  code: string;
}

export interface CustomerInvoiceDPListItem {
  id: string;
  sales_order?: CustomerInvoiceDPSalesOrderMini | null;
  code: string;
  related_invoice_code?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  remaining_amount?: number;
  status: CustomerInvoiceDPStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInvoiceDPDetail = CustomerInvoiceDPListItem;

export interface CustomerInvoiceDPAddSalesOrder {
  id: string;
  code: string;
}

export interface CustomerInvoiceDPAddResponse {
  sales_orders: CustomerInvoiceDPAddSalesOrder[];
}

export interface CreateCustomerInvoiceDPInput {
  sales_order_id: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  notes?: string | null;
}

export type UpdateCustomerInvoiceDPInput = CreateCustomerInvoiceDPInput;
