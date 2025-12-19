// Purchase Order types based on API documentation

export interface Supplier {
  id: number;
  name: string;
  code: string;
}

export interface PaymentTerms {
  id: number;
  name: string;
  description?: string;
}

export interface BusinessUnit {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  image_url: string;
  code: string;
  cost_price: number;
  selling_price: number;
  catalog_number?: string;
  current_hpp?: number;
  stock?: number;
  supplier?: {
    id: number;
    name: string;
  };
  unit_of_measure?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  product_segment?: {
    id: number;
    name: string;
  };
  packaging?: {
    id: number;
    name: string;
  };
}

export interface PurchaseOrderItem {
  id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    code: string;
    image_url: string;
    cost_price: number;
    selling_price: number;
    catalog_number?: string;
    brand?: {
      id: number;
      name: string;
    };
    product_segment?: {
      id: number;
      name: string;
    };
    packaging?: {
      id: number;
      name: string;
    };
  };
  quantity: number;
  price: number;
  discount?: number;
  subtotal: number;
  purchased_quantity?: number; // For items from purchase requisition
}

export interface PurchaseOrder {
  id: number;
  supplier: Supplier;
  code: string;
  order_date: string;
  status: "DRAFT" | "APPROVED" | "REVISED" | "CLOSED";
  is_indent?: boolean;
  status_receipts:
    | "NOT_CREATED"
    | "PENDING"
    | "RECEIVED"
    | "PARTIAL"
    | "COMPLETED";
  status_invoices: "NOT_CREATED" | "PARTIAL" | "COMPLETED";
  payment_status?:
    | "NOT_CREATED"
    | "PARTIAL"
    | "COMPLETED"
    | "UNPAID"
    | "OVERDUE";
  total_amount: number;
  items: PurchaseOrderItem[];
  items_count?: number;
  // Backend might return purchase_order_items instead of items
  purchase_order_items?: PurchaseOrderItem[];
  // Additional fields from backend
  payment_terms_id?: number;
  business_unit_id?: number;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  address?: string;
  due_date?: string;
  created_by?: {
    id: number;
    name: string;
    username: string;
    photo_profile?: string;
    avatar_url?: string;
  };
  // New fields for creation type
  creation_type?: "from_pr" | "from_so";
  purchase_requisitions_id?: number;
  sales_order_id?: number;
  // Related objects from API response
  purchase_requisition?: {
    id: number;
    code: string;
  };
  sales_order?: {
    id: number;
    code: string;
  };
  // Business unit and payment terms objects
  business_unit?: {
    id: number;
    name: string;
  };
  payment_terms?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderCreationType = "from_pr" | "from_so";

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  payment_terms_id: number;
  business_unit_id: number;
  tax_rate: number;
  order_date: string;
  is_indent?: boolean;
  delivery_cost: number;
  other_cost: number;
  notes?: string;
  address?: string;
  due_date?: string;
  items: {
    product_id: number;
    quantity: number;
    price: number;
    discount: number;
  }[];
  // Related IDs for different creation types
  purchase_requisitions_id?: number | null;
  sales_order_id?: number | null;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: number;
  business_unit_id?: number;
  payment_terms_id?: number;
  order_date?: string;
  is_indent?: boolean;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  address?: string;
  due_date?: string;
  items?: {
    product_id: number;
    quantity: number;
    price: number;
    discount: number;
  }[];
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrder[];
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
}

export interface PurchaseOrderResponse {
  data: PurchaseOrder;
  message?: string;
}

export interface DeletePurchaseOrderResponse {
  message: string;
}

export interface ConfirmPurchaseOrderResponse {
  data: PurchaseOrder;
  message?: string;
}

export interface SupplierFromAPI {
  id: number;
  city: {
    id: number;
    name: string;
    province_id: number;
    province_name: string;
  };
  name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
}

export interface PurchaseRequisition {
  id: number;
  code: string;
  supplier_id: number;
  payment_terms_id: number;
  business_unit_id: number;
  request_date: string;
  status: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  subtotal: number;
  total_amount: number;
  notes: string;
  requested_by: number;
  supplier: {
    id: number;
    name: string;
    code: string;
  };
  payment_terms: {
    id: number;
    name: string;
    days: number;
  };
  business_unit: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    username: string;
    name: string;
  };
  items: Array<{
    id: number;
    purchase_requisition_id: number;
    product_id: number;
    quantity: number;
    purchase_price: number;
    discount: number;
    subtotal: number;
    purchased_quantity?: number;
    product: {
      id: number;
      name: string;
      code: string;
      cost_price: number;
      selling_price: number;
    };
    created_at: string;
    updated_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: number;
  customer: {
    id: number;
    name: string;
  };
  payment_terms: {
    id: number;
    name: string;
  };
  employee: {
    id: number;
    name: string;
  };
  business_unit: {
    id: number;
    name: string;
  };
  code: string;
  order_date: string;
  due_date?: string;
  status: string;
  status_delivery: string;
  status_invoice: string;
  notes: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;
  created_by: number;
  created_by_user: {
    id: number;
    name: string;
    username: string;
    photo_profile: string;
  };
  revision_comment: string;
  items: Array<{
    id: number;
    product: {
      id: number;
      name: string;
      code: string;
      cost_price: number;
      selling_price: number;
      image_url: string;
    };
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
  }>;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderAddDataResponse {
  data: {
    products: Product[];
    suppliers: SupplierFromAPI[];
    payment_terms: PaymentTerms[];
    business_units: BusinessUnit[];
    purchase_requisitions: PurchaseRequisition[];
    sales_orders: SalesOrder[];
  };
}

export interface PurchaseOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  dateFrom?: string;
  dateTo?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// Table column definition
export interface PurchaseOrderTableColumn {
  id: keyof PurchaseOrder | "actions";
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
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
  action: "create" | "update" | "delete" | "approve" | "reject" | "convert";
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
  data: AuditTrail[];
  meta: {
    pagination: AuditTrailPaginationMeta;
  };
}
