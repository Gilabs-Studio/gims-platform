// Purchase Requisition types based on API documentation

export interface Supplier {
  id: number;
  name: string;
  code: string;
}

export interface PaymentTerms {
  id: number;
  name: string;
  days: number;
}

export interface BusinessUnit {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  image_url?: string;
  code: string;
  cost_price: number;
  selling_price: number;
  stock?: number;
}

export interface PurchaseRequisitionItem {
  id: number;
  purchase_requisition_id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    code: string;
    cost_price: number;
    selling_price: number;
    image_url?: string;
  };
  quantity: number;
  purchase_price: number;
  discount: number;
  subtotal: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisition {
  id: number;
  code: string;
  supplier_id: number;
  payment_terms_id: number;
  business_unit_id: number;
  request_date: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "CONVERTED";
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  subtotal: number;
  total_amount: number;
  notes: string;
  address?: string;
  requested_by: number;
  supplier: Supplier;
  payment_terms: PaymentTerms;
  business_unit: BusinessUnit;
  user: {
    id: number;
    username: string;
    name: string;
    photo_profile?: string;
    avatar_url?: string;
  };
  items?: PurchaseRequisitionItem[];
  items_count?: number;
  status_receipts?: string;
  status_invoices?: string;
  created_by?: {
    id: number;
    username: string;
    name: string;
    photo_profile?: string;
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseRequisitionRequest {
  supplier_id: number;
  payment_terms_id: number;
  business_unit_id: number;
  request_date: string;
  tax_rate: number;
  delivery_cost: number;
  other_cost: number;
  notes: string;
  address: string;
  requested_by: number;
  items: {
    product_id: number;
    quantity: number;
    purchase_price: number;
    discount: number;
    notes?: string;
  }[];
}

export interface UpdatePurchaseRequisitionRequest {
  supplier_id: number;
  payment_terms_id: number;
  business_unit_id: number;
  request_date: string;
  tax_rate: number;
  delivery_cost: number;
  other_cost: number;
  notes: string;
  address: string;
  requested_by: number;
  items: {
    product_id: number;
    quantity: number;
    purchase_price: number;
    discount: number;
    notes?: string;
  }[];
}

export interface PurchaseRequisitionListResponse {
  success: boolean;
  data: PurchaseRequisition[];
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

export interface PurchaseRequisitionResponse {
  success: boolean;
  data: PurchaseRequisition;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeletePurchaseRequisitionResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface Employee {
  id: number;
  name: string;
  user_id?: number;
  username?: string;
}

export interface SupplierFromAPI {
  id: number;
  name: string;
  phone: string;
  email: string;
  products?: Product[];
}

export interface PurchaseRequisitionAddDataResponse {
  success: boolean;
  data: {
    business_units: BusinessUnit[];
    payment_terms: PaymentTerms[];
    products: Product[];
    suppliers: SupplierFromAPI[];
    employees: Employee[];
  };
  timestamp?: string;
  request_id?: string;
}

export interface PurchaseRequisitionFilters {
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

// Actions response types
export interface ApproveRequisitionResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface RejectRequisitionResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface ConvertRequisitionResponse {
  success: boolean;
  data: {
    purchase_order: {
      id: number;
      code: string;
      business_unit_id: number;
      created_at: string;
      created_by: number;
      delivery_cost: number;
      notes: string;
      request_date: string;
      other_cost: number;
      payment_terms_id: number;
      purchase_requisitions_id: number;
      status: string;
      sub_total: number;
      supplier_id: number;
      tax_amount: number;
      tax_rate: number;
      total_amount: number;
    };
  };
  message: string;
  timestamp?: string;
  request_id?: string;
}

// Table column definition
export interface PurchaseRequisitionTableColumn {
  id: keyof PurchaseRequisition | "actions";
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

