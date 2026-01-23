// Customer Invoice types for Sprint 7

import type { SalesOrder } from "../../order/types";

export interface PaymentTerms {
  id: string;
  code: string;
  name: string;
  description?: string;
  days: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  current_hpp?: number;
  image_url?: string;
}

export interface CustomerInvoiceItem {
  id: string;
  customer_invoice_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  hpp_amount: number;
  created_at: string;
  updated_at: string;
}

export type CustomerInvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type CustomerInvoiceType = "regular" | "proforma";

export interface CustomerInvoice {
  id: string;
  code: string;
  invoice_number?: string;
  type: CustomerInvoiceType;
  sales_order_id?: string;
  sales_order?: SalesOrder;
  payment_terms_id?: string;
  payment_terms?: PaymentTerms;
  invoice_date: string;
  due_date?: string;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  subtotal: number;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  status: CustomerInvoiceStatus;
  payment_at?: string;
  tax_invoice_id?: string;
  notes?: string;
  created_by?: string;
  items?: CustomerInvoiceItem[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListCustomerInvoicesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: CustomerInvoiceStatus;
  type?: CustomerInvoiceType;
  date_from?: string;
  date_to?: string;
  due_date_from?: string;
  due_date_to?: string;
  sales_order_id?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// List items request params
export interface ListCustomerInvoiceItemsParams {
  page?: number;
  per_page?: number;
}

// API Response types
export interface CustomerInvoiceListResponse {
  success: boolean;
  data: CustomerInvoice[];
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

export interface CustomerInvoiceSingleResponse {
  success: boolean;
  data: CustomerInvoice;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Items list response with pagination
export interface CustomerInvoiceItemsListResponse {
  success: boolean;
  data: CustomerInvoiceItem[];
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
  timestamp: string;
  request_id: string;
}

// Form data types for create/update
export interface CreateCustomerInvoiceData {
  invoice_date: string;
  due_date?: string;
  type?: CustomerInvoiceType;
  sales_order_id?: string;
  payment_terms_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  items: CreateCustomerInvoiceItemData[];
}

export interface CreateCustomerInvoiceItemData {
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
  hpp_amount?: number;
}

export interface UpdateCustomerInvoiceData {
  invoice_date?: string;
  due_date?: string;
  type?: CustomerInvoiceType;
  payment_terms_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  notes?: string;
  items?: CreateCustomerInvoiceItemData[];
}

export interface UpdateCustomerInvoiceStatusData {
  status: CustomerInvoiceStatus;
  paid_amount?: number;
  payment_at?: string;
}

export interface RecordPaymentData {
  paid_amount: number;
  payment_at?: string;
  notes?: string;
}
