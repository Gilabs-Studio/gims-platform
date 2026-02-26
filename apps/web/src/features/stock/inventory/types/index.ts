export interface InventoryStockItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_image_url: string | null;
  product_category: string | null;
  product_brand: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  on_hand: number;
  reserved: number;
  available: number;
  min_stock: number;
  max_stock: number;
  uom_name: string | null;
  status: "ok" | "low_stock" | "overstock" | "out_of_stock";
  has_expiring_batches: boolean;
}

export interface InventoryBatchItem {
  id: string;
  batch_number: string;
  expiry_date: string | null;
  current_quantity: number;
  reserved_quantity: number;
  available: number;
}

export interface InventoryBatchesResponse {
  data: InventoryBatchItem[];
  meta: PaginationMeta;
}

// Tree types
export interface StockSummary {
  total_items: number;
  ok: number;
  low: number;
  out_of_stock: number;
  overstock: number;
}

export interface InventoryTreeWarehouse {
  id: string;
  name: string;
  summary: StockSummary;
}

export interface InventoryFilters {
  search?: string;
  warehouse_id?: string;
  low_stock?: boolean;
  product_id?: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
}

export interface InventoryMetrics {
  total_items: number;
  total_products: number;
  total_warehouses: number;
  total_on_hand: number;
  ok_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  overstock_count: number;
  expiring_batches_30_day: number;
  expired_batches: number;
}
