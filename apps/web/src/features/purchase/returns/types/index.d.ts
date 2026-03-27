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
  timestamp?: string;
  request_id?: string;
}

export interface ReturnOption {
  value: string;
  label: string;
}

export interface ReturnWarehouseOption {
  id: string;
  name: string;
}

export interface PurchaseReturnFormData {
  warehouses: ReturnWarehouseOption[];
  return_reasons: ReturnOption[];
  item_conditions: ReturnOption[];
  actions: ReturnOption[];
}

export interface PurchaseReturnItem {
  id: string;
  goods_receipt_item_id?: string | null;
  product_id: string;
  uom_id?: string | null;
  condition: string;
  notes?: string | null;
  qty: number;
  unit_cost: number;
  subtotal: number;
}

export interface PurchaseReturn {
  id: string;
  return_number: string;
  goods_receipt_id: string;
  purchase_order_id?: string | null;
  supplier_id: string;
  warehouse_id: string;
  reason: string;
  action: string;
  status: string;
  notes?: string | null;
  total_amount: number;
  stock_adjustment_id?: string | null;
  debit_note_id?: string | null;
  items: PurchaseReturnItem[];
  created_at: string;
  updated_at: string;
}

export type PurchaseReturnStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface PurchaseReturnListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  action?: string;
  goods_receipt_id?: string;
}

export interface CreatePurchaseReturnItemInput {
  goods_receipt_item_id?: string;
  product_id: string;
  uom_id?: string;
  condition: string;
  notes?: string;
  qty: number;
  unit_cost: number;
}

export interface CreatePurchaseReturnInput {
  goods_receipt_id: string;
  purchase_order_id?: string;
  supplier_id?: string;
  warehouse_id: string;
  reason: string;
  action: string;
  notes?: string;
  items: CreatePurchaseReturnItemInput[];
}

export interface UpdatePurchaseReturnStatusInput {
  status: PurchaseReturnStatus;
}

export interface AuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface PurchaseReturnAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: AuditTrailUser | null;
  created_at: string;
}
