// Sales Order types for Sprint 6

import type { SalesQuotation } from "../../quotation/types";

export interface Area {
  id: string;
  name: string;
  description?: string;
}

// Brief customer from master data (embedded in sales responses)
export interface CustomerBrief {
  id: string;
  code: string;
  name: string;
  customer_type_id?: string;
  address?: string;
  email?: string;
  contact_person?: string;
}

export interface SalesOrderSummary {
  id: string;
  code: string;
  status: string;
  total_amount: number;
  order_date?: string;
}

export type SalesOrderStatus = "draft" | "submitted" | "approved" | "closed" | "rejected" | "cancelled";

// Summary of a linked Delivery Order embedded in Sales Order list response
export interface DeliveryOrderSummary {
  id: string;
  code: string;
  status: string;
  delivery_date: string;
  is_partial_delivery: boolean;
}

// Summary of a linked Customer Invoice embedded in Sales Order list response
export interface CustomerInvoiceSummary {
  id: string;
  code: string;
  status: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  product?: {
    id: string;
    code: string;
    name: string;
    selling_price: number;
    image_url?: string;
  };
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  reserved_quantity: number;
  delivered_quantity: number;
  pending_delivery_quantity?: number;
  installation_status?: string;
  function_test_status?: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentSummary {
  total_ordered: number;
  total_delivered: number;
  total_pending: number;
  total_remaining: number;
}

export interface SalesOrder {
  id: string;
  code: string;
  order_date: string;
  sales_quotation_id?: string;
  sales_quotation?: SalesQuotation;
  customer_id?: string;
  customer?: CustomerBrief;
  payment_terms_id?: string;
  payment_terms?: {
    id: string;
    code: string;
    name: string;
    days: number;
  };
  sales_rep_id?: string;
  sales_rep?: {
    id: string;
    employee_code: string;
    name: string;
  };
  business_unit_id?: string;
  business_unit?: {
    id: string;
    name: string;
  };
  business_type_id?: string;
  business_type?: {
    id: string;
    name: string;
  };
  delivery_area_id?: string;
  delivery_area?: Area;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  delivery_cost: number;
  other_cost: number;
  total_amount: number;
  reserved_stock: boolean;
  status: SalesOrderStatus;
  notes?: string;
  fulfillment?: FulfillmentSummary;
  created_by?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  items?: SalesOrderItem[];
  delivery_orders?: DeliveryOrderSummary[];
  customer_invoices?: CustomerInvoiceSummary[];
  created_at: string;
  updated_at: string;
}

// List request params
export interface ListSalesOrdersParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SalesOrderStatus | string;
  date_from?: string;
  date_to?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  sales_quotation_id?: string;
  unfulfilled_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

// API Response types
export interface SalesOrderListResponse {
  success: boolean;
  data: SalesOrder[];
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

export interface SalesOrderSingleResponse {
  success: boolean;
  data: SalesOrder;
  meta?: {
    created_by?: string;
    updated_by?: string;
  };
  timestamp: string;
  request_id: string;
}

// Form data types for create/update
export interface CreateSalesOrderData {
  order_date: string;
  sales_quotation_id?: string;
  customer_id?: string;
  payment_terms_id?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  business_type_id?: string;
  delivery_area_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  items: CreateSalesOrderItemData[];
}

export interface CreateSalesOrderItemData {
  product_id: string;
  quantity: number;
  price: number;
  discount?: number;
}

export interface UpdateSalesOrderData {
  order_date?: string;
  customer_id?: string;
  payment_terms_id?: string;
  sales_rep_id?: string;
  business_unit_id?: string;
  business_type_id?: string;
  delivery_area_id?: string;
  tax_rate?: number;
  delivery_cost?: number;
  other_cost?: number;
  discount_amount?: number;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
  items?: CreateSalesOrderItemData[];
}

export interface UpdateSalesOrderStatusData {
  status: SalesOrderStatus;
  cancellation_reason?: string;
}

export interface ConvertQuotationToOrderData {
  quotation_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_contact?: string;
  customer_phone?: string;
  customer_email?: string;
  notes?: string;
}
