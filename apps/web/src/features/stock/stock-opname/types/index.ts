export type StockOpnameStatus = 'draft' | 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'posted' | 'completed';

export interface StockOpname {
  id: string;
  opname_number: string;
  warehouse_id: string;
  journal_id?: string;
  warehouse_name?: string;
  description?: string;
  date: string;
  status: StockOpnameStatus;
  
  // Statistics
  total_items: number;
  total_variance_qty: number;
  total_negative_variance_qty: number;
  total_positive_variance_qty: number;
  
  created_at: string;
  updated_at: string;
  
  // Audit
  created_by?: string;
  created_by_name?: string;
}

export interface StockOpnameItem {
  id: string;
  stock_opname_id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  
  system_qty: number;
  physical_qty: number | null;
  variance_qty: number;
  unit_cost: number;
  
  notes?: string;
}

export interface StockOpnameFilter {
  page: number;
  per_page: number;
  search?: string;
  warehouse_id?: string;
  status?: StockOpnameStatus;
  start_date?: string;
  end_date?: string;
}

export interface CreateStockOpnameRequest {
    warehouse_id: string;
    date: string;
    description?: string;
}

export interface UpdateStockOpnameRequest {
    date?: string;
    description?: string;
}

export interface SaveStockOpnameItemsRequest {
    items: StockOpnameItemRequest[];
}

export interface StockOpnameItemRequest {
    product_id: string;
    system_qty: number;
    physical_qty?: number | null;
    notes?: string;
}

export interface UpdateStockOpnameStatusRequest {
    status: StockOpnameStatus;
}

export interface ProductStockLedgerFilter {
  page?: number;
  limit?: number;
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface ProductStockLedgerItem {
  id: string;
  product_id: string;
  transaction_id: string;
  transaction_type: string;
  transaction_type_label: string;
  qty: number;
  unit_cost: number;
  average_cost: number;
  stock_value: number;
  running_qty: number;
  created_at: string;
}

export interface PaginationMeta {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: unknown;
  }
}

export type StockOpnameListResponse = ApiResponse<StockOpname[]>;
export type StockOpnameSingleResponse = ApiResponse<StockOpname>;
export type StockOpnameItemsListResponse = ApiResponse<StockOpnameItem[]>;
export type StockOpnameGenerateJournalResponse = ApiResponse<{
  opname: StockOpname;
  items: StockOpnameItem[];
  has_variance: boolean;
  journal_status: string;
}>;
export type ProductStockLedgerListResponse = ApiResponse<{
  data: ProductStockLedgerItem[];
  meta: PaginationMeta;
}>;

export interface InventoryStockLevelRequest {
  product_id: string;
  warehouse_id: string;
}

export interface InventoryStockLevel {
  product_id: string;
  product_code: string;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string;
  on_hand: number;
  reserved: number;
  available: number;
  uom_name: string;
  status: string;
}

export type InventoryStockLevelListResponse = ApiResponse<{
  data: InventoryStockLevel[];
  meta: PaginationMeta;
}>;
