// POS Terminal TypeScript type definitions

// ─── API envelope ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
  timestamp: string;
  request_id: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page: number | null;
  prev_page: number | null;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type PosSessionStatus = "OPEN" | "CLOSED";

export interface POSSession {
  id: string;
  code: string;
  outlet_id: string;
  warehouse_id: string;
  cashier_id: string;
  opening_cash: number;
  closing_cash?: number | null;
  status: PosSessionStatus;
  total_sales: number;
  total_orders: number;
  opened_at: string;
  closed_at?: string | null;
  notes?: string | null;
  created_at: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export type PosOrderStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "READY"
  | "PAID"
  | "PARTIAL_SERVED"
  | "SERVED"
  | "COMPLETED"
  | "VOIDED";

export type PosOrderType = "DINE_IN" | "TAKE_AWAY" | "DELIVERY";

export type PosItemStatus = "PENDING" | "PREPARING" | "DONE" | "SERVED" | "READY" | "CANCELLED";

export interface POSOrderItem {
  id: string;
  pos_order_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  notes?: string | null;
  status: PosItemStatus;
}

export interface POSOrder {
  id: string;
  order_number: string;
  session_id?: string | null;
  outlet_id: string;
  order_type: PosOrderType;
  table_id?: string | null;
  table_label?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  guest_count: number;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  discount_amount: number;
  total_amount: number;
  status: PosOrderStatus;
  notes?: string | null;
  void_reason?: string | null;
  items: POSOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  outlet_id: string;
  order_type: PosOrderType;
  table_id?: string;
  table_label?: string;
  customer_id?: string;
  customer_name?: string;
  guest_count?: number;
  notes?: string;
}

export interface ConfirmOrderRequest {
  notes?: string;
}

export interface VoidOrderRequest {
  reason: string;
}

export interface AddOrderItemRequest {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface UpdateOrderItemRequest {
  quantity: number;
  notes?: string;
}

export interface AssignTableRequest {
  table_id: string;
  table_label: string;
}

export interface POSOrderListParams {
  outlet_id?: string;
  status?: PosOrderStatus;
  page?: number;
  per_page?: number;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export type ProductKind = "STOCK" | "SERVICE" | "RECIPE";

export interface POSCatalogItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_kind: ProductKind;
  price: number;
  stock: number;
  image_url?: string | null;
  category?: string | null;
  is_available: boolean;
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export type POSPaymentMethod = "CASH" | "CARD" | "QRIS" | "TRANSFER" | "DIGITAL";
export type POSPaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";

export interface POSPayment {
  id: string;
  order_id: string;
  method: POSPaymentMethod;
  status: POSPaymentStatus;
  amount: number;
  tender_amount: number;
  change_amount: number;
  external_order_id?: string | null;
  xendit_invoice_id?: string | null;
  transaction_id?: string | null;
  payment_type?: string | null;
  va_number?: string | null;
  qr_code?: string | null;
  payment_url?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ProcessPaymentRequest {
  method: POSPaymentMethod;
  amount: number;
  notes?: string;
  customer_name?: string;
}

// ─── Xendit Payment Config ────────────────────────────────────────────────────

export type XenditConnectionStatus = "not_connected" | "connected" | "suspended";

export interface XenditConnectionStatusResponse {
  is_connected: boolean;
  status: XenditConnectionStatus;
}

export interface XenditConfig {
  id: string;
  company_id: string;
  xendit_account_id: string;
  business_name: string;
  environment: "sandbox" | "production";
  connection_status: XenditConnectionStatus;
  is_active: boolean;
  updated_at: string;
}

export interface ConnectXenditRequest {
  secret_key: string;
  xendit_account_id?: string;
  business_name?: string;
  environment: "sandbox" | "production";
  webhook_token?: string;
}

export interface UpdateXenditConfigRequest {
  environment?: "sandbox" | "production";
  business_name?: string;
  is_active?: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface POSConfig {
  id: string;
  outlet_id: string;
  tax_rate: number;
  service_charge_rate: number;
  allow_discount: boolean;
  max_discount_percent: number;
  print_receipt_auto: boolean;
  receipt_footer?: string | null;
  currency: string;
}

// ─── Cart (client-side only) ─────────────────────────────────────────────────

export interface CartItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_kind: ProductKind;
  unit_price: number;
  quantity: number;
  notes?: string;
  subtotal: number;
}
