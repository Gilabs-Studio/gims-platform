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

export interface SupplierInvoiceDPListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type SupplierInvoiceDPStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID";

export interface SupplierInvoiceDPPurchaseOrderMini {
  id: string;
  code: string;
}

export interface SupplierInvoiceDPRegularInvoiceMini {
  id: string;
  code: string;
}

export interface SupplierInvoiceDPListItem {
  id: string;
  purchase_order?: SupplierInvoiceDPPurchaseOrderMini | null;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: SupplierInvoiceDPStatus;
  notes?: string | null;
  regular_invoices?: SupplierInvoiceDPRegularInvoiceMini[] | null;
  created_at: string;
  updated_at: string;
}

export type SupplierInvoiceDPDetail = SupplierInvoiceDPListItem;

export interface SupplierInvoiceDPAddPurchaseOrder {
  id: string;
  code: string;
}

export interface SupplierInvoiceDPAddResponse {
  purchase_orders: SupplierInvoiceDPAddPurchaseOrder[];
}

export interface CreateSupplierInvoiceDPInput {
  purchase_order_id: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  notes?: string | null;
}

export type UpdateSupplierInvoiceDPInput = CreateSupplierInvoiceDPInput;
