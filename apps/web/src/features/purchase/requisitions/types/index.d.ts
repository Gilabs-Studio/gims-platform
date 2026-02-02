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
  sort_by?: string;
  sort_dir?: string;
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
