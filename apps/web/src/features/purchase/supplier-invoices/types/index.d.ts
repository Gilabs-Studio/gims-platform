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

export interface SupplierInvoiceListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type SupplierInvoiceStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID";
export type SupplierInvoiceType = "NORMAL" | "DOWN_PAYMENT";

export interface SupplierInvoicePurchaseOrderMini {
  id: string;
  code: string;
}

export interface SupplierInvoicePaymentTermsMini {
  id: string;
  name: string;
}

export interface SupplierInvoiceListItem {
  id: string;
  purchase_order?: SupplierInvoicePurchaseOrderMini | null;
  payment_terms?: SupplierInvoicePaymentTermsMini | null;
  type: SupplierInvoiceType;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  sub_total: number;
  amount: number;
  status: SupplierInvoiceStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceItemDetail {
  id: string;
  supplier_invoice_id: string;
  purchase_order_item_id?: string | null;
  product_id: string;
  product?: unknown;
  quantity: number;
  price: number;
  discount: number;
  sub_total: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceDetail {
  id: string;
  purchase_order?: SupplierInvoicePurchaseOrderMini | null;
  payment_terms?: SupplierInvoicePaymentTermsMini | null;
  type: SupplierInvoiceType;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  sub_total: number;
  amount: number;
  status: SupplierInvoiceStatus;
  notes?: string | null;
  items: SupplierInvoiceItemDetail[];
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceAddPaymentTerms {
  id: string;
  name: string;
}

export interface SupplierInvoiceAddProductMini {
  id: string;
  name: string;
  code?: string | null;
  image_url?: string | null;
}

export interface SupplierInvoiceAddPurchaseOrderItem {
  id: string;
  product?: SupplierInvoiceAddProductMini | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface SupplierInvoiceAddSupplierMini {
  id: string;
  name: string;
}

export interface SupplierInvoiceAddDownPaymentMini {
  id: string;
  purchase_order?: SupplierInvoicePurchaseOrderMini | null;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: SupplierInvoiceStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceAddPurchaseOrder {
  id: string;
  supplier?: SupplierInvoiceAddSupplierMini | null;
  code: string;
  order_date: string;
  status: string;
  total_amount: number;
  items: SupplierInvoiceAddPurchaseOrderItem[];
  invoice_dp?: SupplierInvoiceAddDownPaymentMini | null;
}

export interface SupplierInvoiceAddResponse {
  payment_terms: SupplierInvoiceAddPaymentTerms[];
  purchase_orders: SupplierInvoiceAddPurchaseOrder[];
}

export interface SupplierInvoiceItemInput {
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface CreateSupplierInvoiceInput {
  purchase_order_id: string;
  payment_terms_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  delivery_cost: number;
  other_cost: number;
  notes?: string | null;
  items: SupplierInvoiceItemInput[];
}

export type UpdateSupplierInvoiceInput = CreateSupplierInvoiceInput;

export interface AuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface SupplierInvoiceAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: AuditTrailUser | null;
  created_at: string;
}
