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

export interface GoodsReceiptListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type GoodsReceiptStatus = "DRAFT" | "CONFIRMED";

export interface GoodsReceiptPurchaseOrderMini {
  id: string;
  code: string;
}

export interface GoodsReceiptSupplierMini {
  id: string;
  name: string;
}

export interface GoodsReceiptListItem {
  id: string;
  code: string;
  purchase_order?: GoodsReceiptPurchaseOrderMini | null;
  supplier?: GoodsReceiptSupplierMini | null;
  receipt_date?: string | null;
  notes?: string | null;
  status: GoodsReceiptStatus;
  created_by: string;
  created_at: string;
}

export interface GoodsReceiptPurchaseOrderDetail {
  id: string;
  code: string;
  status: string;
}

export interface GoodsReceiptProductMini {
  id: string;
  name: string;
  sku?: string | null;
}

export interface GoodsReceiptItemDetail {
  id: string;
  purchase_order_item_id: string;
  product?: GoodsReceiptProductMini | null;
  quantity_received: number;
  notes?: string | null;
}

export interface GoodsReceiptDetail {
  id: string;
  code: string;
  purchase_order?: GoodsReceiptPurchaseOrderDetail | null;
  supplier?: GoodsReceiptSupplierMini | null;
  receipt_date?: string | null;
  notes?: string | null;
  status: GoodsReceiptStatus;
  created_by: string;
  created_at: string;
  items: GoodsReceiptItemDetail[];
}

export interface GoodsReceiptItemInput {
  purchase_order_item_id: string;
  product_id: string;
  quantity_received: number;
  notes?: string | null;
}

export interface CreateGoodsReceiptInput {
  purchase_order_id: string;
  notes?: string | null;
  items: GoodsReceiptItemInput[];
}

export interface UpdateGoodsReceiptInput {
  notes?: string | null;
  items: GoodsReceiptItemInput[];
}

export interface GoodsReceiptPurchaseOrderOption {
  id: string;
  code: string;
  status: string;
  supplier?: GoodsReceiptSupplierMini | null;
}

export interface GoodsReceiptAddResponse {
  eligible_purchase_orders: GoodsReceiptPurchaseOrderOption[];
}

export interface GoodsReceiptAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface GoodsReceiptAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: GoodsReceiptAuditTrailUser | null;
  created_at: string;
}
