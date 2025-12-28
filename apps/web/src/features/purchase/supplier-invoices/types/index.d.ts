// Supplier Invoice types based on API documentation

export interface PurchaseOrder {
  id: number;
  code: string;
  supplier?: {
    id: number;
    name: string;
    code?: string;
  };
}

export interface PaymentTerms {
  id: number;
  name: string;
}

export interface SupplierInvoiceItem {
  id: number;
  supplier_invoice_id: number;
  product_id: number;
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
  sub_total: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  photo_profile?: string;
  avatar_url?: string;
}

export interface TaxInvoice {
  id: number;
  tax_invoice_number: string;
  tax_invoice_date: string;
}

export interface SupplierInvoice {
  id: number;
  purchase_order: PurchaseOrder;
  payment_terms: PaymentTerms;
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  sub_total: number;
  amount: number;
  remaining_amount?: number;
  status: "DRAFT" | "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE";
  notes: string;
  items: SupplierInvoiceItem[];
  tax_invoice?: TaxInvoice;
  created_by?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierInvoiceRequest {
  purchase_order_id: number;
  payment_terms_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  tax_rate: number;
  delivery_cost: number;
  other_cost: number;
  notes: string;
  items: {
    product_id: number;
    quantity: number;
    price: number;
    discount: number;
  }[];
}

export interface UpdateSupplierInvoiceRequest {
  payment_terms_id?: number;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  items?: {
    product_id: number;
    quantity: number;
    price: number;
    discount: number;
  }[];
}

export interface SupplierInvoiceListResponse {
  success: boolean;
  data: SupplierInvoice[];
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

export interface SupplierInvoiceResponse {
  success: boolean;
  data: SupplierInvoice;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeleteSupplierInvoiceResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface PurchaseOrderFromAPI {
  id: number;
  supplier: {
    id: number;
    name: string;
  };
  code: string;
  order_date: string;
  status: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  sub_total: number;
  total_amount: number;
  payment_terms?: {
    id: number;
    name: string;
  };
  invoice_dp?: {
    id: number;
    purchase_order: {
      id: number;
      code: string;
    };
    code: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    amount: number;
    status: string;
    notes: string;
    created_at: string;
    updated_at: string;
  };
  items: {
    id: number;
    product: {
      id: number;
      name: string;
      code: string;
      selling_price: number;
      image_url: string;
    };
    quantity: number;
    price: number;
    subtotal: number;
    received_quantity: number;
    invoiced_quantity: number;
  }[];
}

export interface PaymentTermsFromAPI {
  id: number;
  name: string;
}

export interface SupplierInvoiceDP {
  id: number;
  purchase_order: {
    id: number;
    code: string;
  };
  code: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceAddDataResponse {
  success: boolean;
  data: {
    payment_terms: PaymentTermsFromAPI[];
    purchase_orders: PurchaseOrderFromAPI[];
    invoice_dp?: SupplierInvoiceDP;
  };
  timestamp?: string;
  request_id?: string;
}

export interface SupplierInvoiceFilters {
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
  status?: string;
}

// Table column definition
export interface SupplierInvoiceTableColumn {
  id: keyof SupplierInvoice | "actions";
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

export interface CreateTaxInvoiceRequest {
  tax_invoice_number: string;
  tax_invoice_date: string;
}

export interface CreateTaxInvoiceResponse {
  success: boolean;
  data: TaxInvoice;
  message: string;
  timestamp?: string;
  request_id?: string;
}




