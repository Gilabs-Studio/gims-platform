// Payment PO types based on API documentation

export interface BankAccount {
  id: number;
  name: string;
  account_number: string;
  account_holder: string;
  currency: string;
}

export interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  type: string;
}

export interface PaymentAllocation {
  id?: number;
  chart_of_account_id: number;
  amount: number;
  chart_of_account?: ChartOfAccount;
}

export interface PurchaseOrder {
  id: number;
  code: string;
}

export interface SupplierInvoice {
  id: number;
  code?: string; // For main API responses
  purchase_order?: PurchaseOrder; // For ADD data responses
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount?: number; // Available in ADD data responses
  remaining_amount?: number; // Available in ADD data responses
  status: "UNPAID" | "PARTIAL" | "OVERDUE" | "PAID";
}

export interface PaymentPO {
  id: number;
  invoice: SupplierInvoice;
  bank_account: BankAccount;
  payment_date: string;
  amount: number;
  remaining_amount: number; // Remaining unpaid amount at the time of payment creation
  method: "CASH" | "BANK";
  status: "PENDING" | "CONFIRMED";
  notes?: string;
  created_at: string;
  updated_at: string;
  // Purchase Order related information
  po_code?: string;
  supplier_name?: string;
  allocations?: PaymentAllocation[];
}

export interface CreatePaymentPORequest {
  invoice_id: number;
  bank_account_id?: number;
  payment_date?: string;
  amount: number;
  method: "CASH" | "BANK";
  notes?: string;
  allocations?: PaymentAllocation[];
}

export interface UpdatePaymentPORequest {
  invoice_id: number;
  bank_account_id?: number;
  payment_date?: string;
  amount: number;
  method: "CASH" | "BANK";
  notes?: string;
  allocations?: PaymentAllocation[];
}

export interface PaymentPOListResponse {
  success: boolean;
  data: PaymentPO[];
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

export interface PaymentPOResponse {
  success: boolean;
  data: PaymentPO;
  message?: string;
  timestamp?: string;
  request_id?: string;
}

export interface DeletePaymentPOResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  request_id?: string;
}

export interface PaymentPOAddDataResponse {
  success: boolean;
  data: {
    bank_accounts: BankAccount[];
    invoices: SupplierInvoice[];
    chart_of_accounts: ChartOfAccount[];
  };
  timestamp?: string;
  request_id?: string;
}

export interface PaymentPOFilters {
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
  status?: "PENDING" | "CONFIRMED";
}

// Table column definition
export interface PaymentPOTableColumn {
  id: keyof PaymentPO | "actions";
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

// Confirm payment response
export interface ConfirmPaymentPOResponse {
  success: boolean;
  data: PaymentPO;
  message: string;
  timestamp?: string;
  request_id?: string;
}
