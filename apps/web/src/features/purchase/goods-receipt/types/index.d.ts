// Goods Receipt types based on API documentation

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  city: {
    id: number;
    name: string;
    province_id: number;
    province_name: string;
  };
}

export interface PurchaseOrder {
  id: number;
  supplier: {
    id: number;
    name: string;
  };
  code: string;
  order_date: string;
  status: string;
  status_invoices?: 'NOT_CREATED' | 'PAID';
  total_amount: number;
  items: {
    id: number;
    product: {
      id: number;
      name: string;
      code: string;
      selling_price: number;
    };
    quantity: number;
    price: number;
    subtotal: number;
    received_quantity?: number;
  }[];
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  selling_price: number;
}

export interface GoodsReceiptItem {
  id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    code: string;
    selling_price: number;
  };
  inventory_batch_id?: number;
  quantity: number;
  lot_number?: string;
  expired_date?: string;
}

export interface GoodsReceipt {
  id: number;
  purchase_order_id: number;
  purchase_order?: PurchaseOrder;
  warehouse: Warehouse;
  code: string;
  receipt_date: string;
  notes?: string;
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL';
  received_by: {
    id: number;
    name: string;
    username: string;
    photo_profile?: string;
    avatar_url?: string;
  };
  items: GoodsReceiptItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateGoodsReceiptRequest {
  purchase_order_id: number;
  warehouse_id: number;
  receipt_date: string;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
    lot_number?: string;
    expired_date?: string;
  }[];
}

export interface UpdateGoodsReceiptRequest {
  receipt_date: string;
  warehouse_id: number;
  notes?: string;
  items: {
    product_id: number;
    quantity: number;
    lot_number?: string;
    expired_date?: string;
  }[];
}

export interface GoodsReceiptListResponse {
  success: boolean;
  data: GoodsReceipt[];
  meta: {
    filter: {
      end_date: string;
      start_date: string;
    };
    pagination: {
      limit: number;
      page: number;
      total: number;
    };
    search: {
      search: string;
      searchBy: string;
    };
    searchable_columns: {
      numeric_columns: string[];
      string_columns: string[];
    };
    sort: {
      sort_by: string;
      sort_order: string;
    };
    sortable_columns: {
      available_fields: string[];
    };
  };
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface GoodsReceiptResponse {
  success: boolean;
  data: GoodsReceipt;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeleteGoodsReceiptResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface GoodsReceiptAddDataResponse {
  success: boolean;
  data: {
    warehouses: Warehouse[];
    purchase_orders: PurchaseOrder[];
  };
  timestamp?: string;
  request_id?: string;
}

export interface GoodsReceiptFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  dateFrom?: string;
  dateTo?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  status?: 'PENDING' | 'RECEIVED' | 'PARTIAL';
}

// Table column definition
export interface GoodsReceiptTableColumn {
  id: keyof GoodsReceipt | 'actions';
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

// Filter meta types
export interface DateRangeFilterMeta {
  from?: Date;
  to?: Date;
}

export interface SortMeta {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

// Stats types
export interface GoodsReceiptStats {
  total: number;
  pending: number;
  received: number;
  partial: number;
}

export interface GoodsReceiptStatsResponse {
  success: boolean;
  data: GoodsReceiptStats;
  timestamp?: string;
  request_id?: string;
}

// Audit Trail types
export interface AuditTrailUser {
  id: number;
  username: string;
  name: string;
  avatar_url?: string;
}

export interface AuditTrail {
  id: number;
  user_id: number;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'convert';
  entity: string;
  entity_id: number;
  before_data?: string | null;
  after_data?: string | null;
  created_at: string;
  updated_at: string;
  user: AuditTrailUser;
}

export interface AuditTrailPaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export interface AuditTrailResponse {
  success: boolean;
  data: AuditTrail[];
  meta: {
    pagination: AuditTrailPaginationMeta;
  };
  timestamp?: string;
  request_id?: string;
}

// Confirm response
export interface ConfirmGoodsReceiptResponse {
  success: boolean;
  message: string;
  data: GoodsReceipt;
  timestamp?: string;
  request_id?: string;
}




