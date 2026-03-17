export interface CustomerResearchKpis {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  total_revenue: number;
  average_order_value: number;
}

export interface CustomerRevenueTrendPoint {
  period: string;
  total_revenue: number;
  total_orders: number;
}

export interface CustomerResearchKpisResponse {
  success: boolean;
  data: CustomerResearchKpis;
}

export interface RevenueTrendResponse {
  success: boolean;
  data: {
    data: CustomerRevenueTrendPoint[];
  };
}

export interface CustomerRankResponse {
  success: boolean;
  data: {
    data: CustomerResearchListItem[];
  };
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
}

export type CustomerResearchTab = "top" | "inactive" | "payment_behavior";

export interface CustomerResearchListItem {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  last_order_date?: string;
}

export interface ListCustomerResearchRequest {
  start_date?: string;
  end_date?: string;
  tab?: CustomerResearchTab;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "orders" | "name" | "last_order";
  order?: "asc" | "desc";
}

export interface ListCustomerResearchResponse {
  success: boolean;
  data: {
    data: CustomerResearchListItem[];
  };
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

export interface CustomerDetail {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  last_order_date?: string;
}

export interface CustomerDetailResponse {
  success: boolean;
  data: CustomerDetail;
}

export interface CustomerProductItem {
  product_id: string;
  product_code: string;
  product_name: string;
  total_qty: number;
  total_revenue: number;
  total_orders: number;
}

export interface CustomerTopProductsResponse {
  success: boolean;
  data: {
    data: CustomerProductItem[];
  };
}
