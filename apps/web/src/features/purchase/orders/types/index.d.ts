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

export interface PurchaseOrderListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type PurchaseOrderStatus = "DRAFT" | "SUBMITTED" | "REJECTED" | "APPROVED" | "CLOSED";

export interface PurchaseOrderRequisitionRef {
  id: string;
  code: string;
}

export interface PurchaseOrderGRSummary {
  id: string;
  code: string;
  status: string;
}

export interface PurchaseOrderSISummary {
  id: string;
  code: string;
  status: string;
}

export interface POFulfillmentSummary {
  total_ordered: number;
  total_received: number;
  total_pending: number;
  total_remaining: number;
}

export interface PurchaseOrderParty {
  id: string;
  name: string;
  code?: string;
}

export interface PurchaseOrderAddProduct {
  id: string;
  code: string;
  name: string;
  stock: number;
  current_hpp: number;
  supplier_id?: string | null;
  is_active: boolean;
  is_approved: boolean;
}

export interface PurchaseOrderAddSupplier {
  id: string;
  code: string;
  name: string;
  products: PurchaseOrderAddProduct[];
}

export interface PurchaseOrderAddPaymentTerms {
  id: string;
  code: string;
  name: string;
  days: number;
}

export interface PurchaseOrderAddBusinessUnit {
  id: string;
  name: string;
}

export interface PurchaseOrderAddResponse {
  suppliers: PurchaseOrderAddSupplier[];
  payment_terms: PurchaseOrderAddPaymentTerms[];
  business_units: PurchaseOrderAddBusinessUnit[];
}

export interface PurchaseOrderItemInput {
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
  notes?: string | null;
}

export interface CreatePurchaseOrderInput {
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  purchase_requisitions_id?: string | null;
  sales_order_id?: string | null;
  order_date: string;
  due_date?: string | null;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  items: PurchaseOrderItemInput[];
}

export interface UpdatePurchaseOrderInput {
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  order_date: string;
  due_date?: string | null;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItemDetail {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
  subtotal: number;
  notes?: string | null;
  product?: unknown;
}

export interface PurchaseOrderDetail {
  id: string;
  code: string;
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  purchase_requisitions_id?: string | null;
  sales_order_id?: string | null;
  order_date: string;
  due_date?: string | null;
  notes?: string;
  status: PurchaseOrderStatus;
  tax_rate?: number;
  tax_amount?: number;
  delivery_cost?: number;
  other_cost?: number;
  sub_total?: number;
  total_amount: number;
  supplier?: unknown;
  payment_terms?: unknown;
  business_unit?: unknown;
  purchase_requisition?: PurchaseOrderRequisitionRef | null;
  items: PurchaseOrderItemDetail[];
  created_at: string;
  updated_at: string;
  submitted_at?: string | null;
  approved_at?: string | null;
  closed_at?: string | null;
}

export interface PurchaseOrderAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface PurchaseOrderAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: PurchaseOrderAuditTrailUser | null;
  created_at: string;
}

export interface PurchaseOrderListItem {
  id: string;
  code: string;
  order_date: string;
  due_date?: string | null;
  status: PurchaseOrderStatus;
  total_amount: number;
  supplier?: PurchaseOrderParty | null;
  purchase_requisition?: PurchaseOrderRequisitionRef | null;
  goods_receipts?: PurchaseOrderGRSummary[];
  supplier_invoices?: PurchaseOrderSISummary[];
  fulfillment?: POFulfillmentSummary | null;
}
