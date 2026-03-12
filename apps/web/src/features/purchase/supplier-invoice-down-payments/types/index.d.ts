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
  purchase_order_id?: string;
}

export type SupplierInvoiceDPStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "UNPAID"
  | "PARTIAL"
  | "PAID";

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
  supplier_id: string;
  supplier_name: string;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: SupplierInvoiceDPStatus;
  notes?: string | null;
  regular_invoices?: SupplierInvoiceDPRegularInvoiceMini[] | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceDPDetail extends SupplierInvoiceDPListItem {
  created_by?: string;
}

export interface SupplierInvoiceDPAddProductMini {
  id: string;
  name: string;
  code?: string | null;
  image_url?: string | null;
}

export interface SupplierInvoiceDPAddSupplierMini {
  id: string;
  name: string;
}

export interface SupplierInvoiceDPAddPurchaseOrderItem {
  id: string;
  product?: SupplierInvoiceDPAddProductMini | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface SupplierInvoiceDPAddPurchaseOrder {
  id: string;
  code: string;
  supplier?: SupplierInvoiceDPAddSupplierMini | null;
  order_date: string;
  status: string;
  total_amount: number;
  items: SupplierInvoiceDPAddPurchaseOrderItem[];
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

export interface SupplierInvoiceDPAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface SupplierInvoiceDPAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata?: Record<string, unknown>;
  user?: SupplierInvoiceDPAuditTrailUser | null;
  created_at: string;
}

export interface SupplierInvoiceDPAuditTrailParams {
  page?: number;
  per_page?: number;
}
