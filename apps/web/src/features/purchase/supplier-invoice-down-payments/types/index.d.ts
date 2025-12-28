// Supplier Invoice Down Payment types based on API documentation

export interface PurchaseOrder {
  id: number;
  code: string;
  supplier?: {
    id: number;
    name: string;
  };
  order_date?: string;
  status?: string;
  total_amount?: number;
  items?: {
    id: number;
    product: {
      id: number;
      name: string;
      code: string;
      image_url?: string;
    };
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

export interface SupplierInvoiceDownPayment {
  id: number;
  purchase_order_id: number;
  purchase_order?: PurchaseOrder;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: "DRAFT" | "UNPAID" | "PAID";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInvoiceDownPaymentRequest {
  purchase_order_id: number;
  invoice_date: string;
  due_date: string;
  amount: number;
  notes?: string;
}

export interface UpdateSupplierInvoiceDownPaymentRequest {
  purchase_order_id?: number;
  invoice_date?: string;
  due_date?: string;
  amount?: number;
  notes?: string;
}

export interface SupplierInvoiceDownPaymentListResponse {
  success: boolean;
  data: SupplierInvoiceDownPayment[];
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

export interface SupplierInvoiceDownPaymentResponse {
  success: boolean;
  data: SupplierInvoiceDownPayment;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeleteSupplierInvoiceDownPaymentResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface SupplierInvoiceDownPaymentAddDataResponse {
  success: boolean;
  data: {
    purchase_orders: PurchaseOrder[];
  };
  timestamp?: string;
  request_id?: string;
}

export interface SupplierInvoiceDownPaymentFilters {
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
  status?: "DRAFT" | "UNPAID" | "PAID";
}

// Actions response types
export interface PendingInvoiceResponse {
  success: boolean;
  data: SupplierInvoiceDownPayment;
  message: string;
  timestamp?: string;
  request_id?: string;
}

// Table column definition
export interface SupplierInvoiceDownPaymentTableColumn {
  id: keyof SupplierInvoiceDownPayment | "actions";
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
  success: boolean;
  data: AuditTrail[];
  meta: {
    pagination: AuditTrailPaginationMeta;
  };
  timestamp?: string;
  request_id?: string;
}




