// ── Public self-order API types ───────────────────────────────────────────────

export interface POSCatalogItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_kind: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  description?: string;
  is_available: boolean;
}

export interface PublicPOSConfig {
  tax_rate: number;
  service_charge_rate: number;
  currency: string;
}

export interface PublicTableInfo {
  outlet_id: string;
  outlet_name: string;
  table_label: string;
  token: string;
  catalog: POSCatalogItem[];
  config: PublicPOSConfig;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface CreateCustomerOrderRequest {
  customer_name: string;
  items: Array<{
    product_id: string;
    quantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface CustomerOrderItemResponse {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
}

export interface CustomerOrderResponse {
  order_id: string;
  order_number: string;
  table_label: string;
  status: string;
  payment_status?: string;
  cancel_reason?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  items: CustomerOrderItemResponse[];
  created_at: string;
}

export interface InitiatePaymentRequest {
  method: "QRIS" | "DIGITAL";
  amount: number;
  channel_code?: string;
  success_redirect_url?: string;
  failure_redirect_url?: string;
}

export interface InitiatePaymentResponse {
  id?: string;
  payment_id?: string;
  method: string;
  qr_string?: string;
  qr_image_url?: string;
  payment_url?: string;
  status: string;
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
