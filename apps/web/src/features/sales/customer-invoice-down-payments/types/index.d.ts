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
  sales_order_id?: string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export type CustomerInvoiceDPStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "UNPAID"
  | "WAITING_PAYMENT"
  | "PARTIAL"
  | "PAID"
  | "CANCELLED";

export interface CustomerInvoiceDPSalesOrderMini {
  id: string;
  code: string;
  customer_id?: string | null;
  customer_name?: string | null;
}

export interface CustomerInvoiceDPListItem {
  id: string;
  sales_order?: CustomerInvoiceDPSalesOrderMini | null;
  code: string;
  related_invoice_code?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  amount: number;
  remaining_amount?: number;
  status: CustomerInvoiceDPStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInvoiceDPDetail = CustomerInvoiceDPListItem;

export interface CustomerInvoiceDPAddCustomer {
  id: string;
  name: string;
}

export interface CustomerInvoiceDPAddProduct {
  id: string;
  name: string;
  code: string;
  image_url?: string;
}

export interface CustomerInvoiceDPAddSalesOrderItem {
  id: string;
  product?: CustomerInvoiceDPAddProduct | null;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CustomerInvoiceDPAddSalesOrder {
  id: string;
  code: string;
  customer?: CustomerInvoiceDPAddCustomer | null;
  order_date: string;
  status: string;
  total_amount: number;
  items: CustomerInvoiceDPAddSalesOrderItem[];
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

export interface CustomerInvoiceAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata?: Record<string, unknown>;
  user?: AuditTrailUser | null;
  created_at: string;
}

export interface AuditTrailUser {
  id: string;
  email: string;
  name: string;
}
