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
  };
  error?: string;
}

export interface PurchaseRequisitionListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: PurchaseRequisitionStatus | string;
  sort_by?: string;
  sort_dir?: string;
  limit?: number;
}

export interface PurchaseRequisitionParty {
  id: string;
  name: string;
  code?: string;
}

export interface PurchaseRequisitionPaymentTerms {
  id: string;
  name: string;
  days: number;
}

export interface PurchaseRequisitionBusinessUnit {
  id: string;
  name: string;
}

export interface PurchaseRequisitionUser {
  id: string;
  email: string;
  name: string;
}

export type PurchaseRequisitionStatus =
  | "DRAFT"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED";

export interface PurchaseRequisitionListItem {
  id: string;
  code: string;
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  requested_by?: string | null;
  request_date: string;
  status: PurchaseRequisitionStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;
  notes?: string;

  supplier?: PurchaseRequisitionParty;
  payment_terms?: PurchaseRequisitionPaymentTerms;
  business_unit?: PurchaseRequisitionBusinessUnit;
  user?: PurchaseRequisitionUser;

  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisitionProductRef {
  id: string;
  name: string;
  code: string;
}

export interface PurchaseRequisitionAuditTrailUser {
  id: string;
  email: string;
  name: string;
}

export interface PurchaseRequisitionAuditTrailEntry {
  id: string;
  action: string;
  permission_code: string;
  target_id: string;
  metadata: Record<string, unknown>;
  user?: PurchaseRequisitionAuditTrailUser | null;
  created_at: string;
}

export interface PurchaseRequisitionConvertResponse {
  purchase_requisition_id: string;
  purchase_order_id: string;
  purchase_order_code: string;
}

export interface PurchaseRequisitionAddProduct {
  id: string;
  code: string;
  name: string;
  stock: number;
  current_hpp: number;
  supplier_id?: string | null;
  is_active: boolean;
  is_approved: boolean;
}

export interface PurchaseRequisitionAddSupplier {
  id: string;
  code: string;
  name: string;
  products: PurchaseRequisitionAddProduct[];
}

export interface PurchaseRequisitionAddPaymentTerms {
  id: string;
  code: string;
  name: string;
  days: number;
}

export interface PurchaseRequisitionAddBusinessUnit {
  id: string;
  name: string;
}

export interface PurchaseRequisitionAddEmployee {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  is_active: boolean;
}

export interface PurchaseRequisitionAddResponse {
  suppliers: PurchaseRequisitionAddSupplier[];
  payment_terms: PurchaseRequisitionAddPaymentTerms[];
  business_units: PurchaseRequisitionAddBusinessUnit[];
  employees: PurchaseRequisitionAddEmployee[];
}

export interface PurchaseRequisitionItem {
  id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  discount: number;
  subtotal: number;
  notes?: string | null;
  product?: PurchaseRequisitionProductRef;
}

export interface PurchaseRequisitionDetail {
  id: string;
  code: string;
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  employee_id?: string | null;
  request_date: string;
  address?: string | null;
  notes?: string;
  status: PurchaseRequisitionStatus;

  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;

  supplier?: PurchaseRequisitionParty;
  payment_terms?: PurchaseRequisitionPaymentTerms;
  business_unit?: PurchaseRequisitionBusinessUnit;
  user?: PurchaseRequisitionUser;

  items: PurchaseRequisitionItem[];

  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisitionItemInput {
  product_id: string;
  quantity: number;
  purchase_price: number;
  discount?: number;
  notes?: string | null;
}

export interface CreatePurchaseRequisitionInput {
  supplier_id?: string | null;
  payment_terms_id?: string | null;
  business_unit_id?: string | null;
  employee_id?: string | null;
  request_date: string;
  address?: string | null;
  notes?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  items: PurchaseRequisitionItemInput[];
}

export type UpdatePurchaseRequisitionInput = CreatePurchaseRequisitionInput;
