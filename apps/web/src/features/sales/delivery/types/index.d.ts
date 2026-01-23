// Delivery Order types for Sprint 6

export type DeliveryOrderStatus = "draft" | "prepared" | "shipped" | "delivered" | "cancelled";

export interface DeliveryOrderItem {
  id: string;
  delivery_order_id: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    name: string;
    image_url?: string;
  };
  sales_order_item_id?: string;
  sales_order_item?: {
    id: string;
    quantity: number;
    reserved_quantity: number;
    delivered_quantity: number;
  };
  inventory_batch_id?: string;
  inventory_batch?: {
    id: string;
    batch_number: string;
    quantity: number;
    expiry_date?: string;
  };
  quantity: number;
  installation_status?: string;
  function_test_status?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryOrder {
  id: string;
  code: string;
  delivery_date: string;
  sales_order_id: string;
  sales_order?: {
    id: string;
    code: string;
    status: string;
    total_amount: number;
  };
  delivered_by_id?: string;
  delivered_by?: {
    id: string;
    employee_code: string;
    name: string;
  };
  courier_agency_id?: string;
  courier_agency?: {
    id: string;
    code: string;
    name: string;
  };
  tracking_number: string;
  receiver_name?: string;
  receiver_phone?: string;
  delivery_address?: string;
  receiver_signature?: string;
  status: DeliveryOrderStatus;
  notes?: string;
  is_partial_delivery: boolean;
  created_by?: string;
  shipped_by?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  items?: DeliveryOrderItem[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListDeliveryOrdersParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: DeliveryOrderStatus;
  date_from?: string;
  date_to?: string;
  sales_order_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// API Response types
export interface DeliveryOrderListResponse {
  success: boolean;
  data: DeliveryOrder[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    filters?: Record<string, unknown>;
  };
  timestamp: string;
  request_id: string;
}

export interface DeliveryOrderSingleResponse {
  success: boolean;
  data: DeliveryOrder;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Form data types for create/update
export interface CreateDeliveryOrderData {
  delivery_date: string;
  sales_order_id: string;
  delivered_by_id?: string;
  courier_agency_id?: string;
  tracking_number?: string;
  receiver_name?: string;
  receiver_phone?: string;
  delivery_address?: string;
  notes?: string;
  items: CreateDeliveryOrderItemData[];
}

export interface CreateDeliveryOrderItemData {
  product_id: string;
  sales_order_item_id?: string;
  inventory_batch_id?: string;
  quantity: number;
  installation_status?: string;
  function_test_status?: string;
}

export interface UpdateDeliveryOrderData {
  delivery_date?: string;
  delivered_by_id?: string;
  courier_agency_id?: string;
  tracking_number?: string;
  receiver_name?: string;
  receiver_phone?: string;
  delivery_address?: string;
  notes?: string;
  items?: CreateDeliveryOrderItemData[];
}

export interface UpdateDeliveryOrderStatusData {
  status: DeliveryOrderStatus;
  cancellation_reason?: string;
}

export interface ShipDeliveryOrderData {
  tracking_number: string;
}

export interface DeliverDeliveryOrderData {
  receiver_signature: string;
  receiver_name?: string;
  receiver_phone?: string;
}

export interface BatchSelectionRequest {
  product_id: string;
  quantity: number;
  method: "FIFO" | "FEFO";
  warehouse_id?: string;
}

export interface BatchSelectionResponse {
  success: boolean;
  data: {
    batches: Array<{
      id: string;
      batch_number: string;
      quantity: number;
      expiry_date?: string;
      selected_quantity: number;
    }>;
  };
}
