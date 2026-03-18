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

export interface SalesReturnFormData {
  warehouses: ReturnWarehouseOption[];
  return_reasons: ReturnOption[];
  item_conditions: ReturnOption[];
  actions: ReturnOption[];
  refund_methods: ReturnOption[];
}

export interface SalesReturnItem {
  id: string;
  invoice_item_id?: string | null;
  product_id: string;
  uom_id?: string | null;
  condition: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface SalesReturn {
  id: string;
  return_number: string;
  invoice_id: string;
  delivery_id?: string | null;
  warehouse_id: string;
  customer_id: string;
  reason: string;
  action: string;
  status: string;
  notes?: string | null;
  total_amount: number;
  stock_adjustment_id?: string | null;
  credit_note_id?: string | null;
  items: SalesReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesReturnListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  action?: string;
  invoice_id?: string;
}

export interface CreateSalesReturnItemInput {
  invoice_item_id?: string;
  product_id: string;
  uom_id?: string;
  condition: string;
  qty: number;
  unit_price: number;
}

export interface CreateSalesReturnInput {
  invoice_id: string;
  delivery_id?: string;
  warehouse_id: string;
  customer_id: string;
  reason: string;
  action: string;
  notes?: string;
  items: CreateSalesReturnItemInput[];
}
