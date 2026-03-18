// Sales Overview Report types
// Data sourced from: Employee (Sales Rep position), CRM (check-in), Sales (products), Customer

export interface SalesRepPerformance {
  employee_id: string;
  employee_code: string;
  name: string;
  email?: string;
  avatar_url?: string;
  position_name?: string;
  division_name?: string;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  total_deliveries: number;
  total_invoices: number;
  visits_completed: number;
  tasks_completed: number;
  conversion_rate: number;
  average_order_value: number;
  average_order_value_formatted: string;
  target_amount?: number;
  target_amount_formatted?: string;
  target_achievement_percentage?: number;
  // Mapped id for DataTable compatibility
  id?: string;
}

export interface ListSalesRepPerformanceRequest {
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "orders" | "visits" | "name" | "target";
  order?: "asc" | "desc";
}

export interface ListSalesRepPerformanceResponse {
  success: boolean;
  data: SalesRepPerformance[];
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

export interface MonthlySalesData {
  month: number;
  month_name: string;
  year: number;
  total_revenue: number;
  total_cash_in: number;
  total_orders: number;
  total_visits: number;
  total_deliveries: number;
  target_amount: number;
}

export interface MonthlySalesOverviewData {
  monthly_data: MonthlySalesData[];
  total_revenue: number;
  total_cash_in: number;
  total_orders: number;
  total_visits: number;
  total_deliveries: number;
}

export interface MonthlySalesOverviewResponse {
  success: boolean;
  data: MonthlySalesOverviewData;
}

export interface SalesRepStatisticsData {
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  visits_completed: number;
  tasks_completed: number;
  conversion_rate: number;
  average_order_value: number;
  average_order_value_formatted: string;
  period_comparison?: {
    revenue_change: number;
    orders_change: number;
    visits_change: number;
  };
}

export interface SalesRepDetail {
  employee_id: string;
  employee_code: string;
  name: string;
  email?: string;
  avatar_url?: string;
  position_name?: string;
  division_name?: string;
  statistics?: SalesRepStatisticsData;
}

export interface SalesRepDetailResponse {
  success: boolean;
  data: SalesRepDetail;
}

export interface GetSalesRepDetailRequest {
  start_date?: string;
  end_date?: string;
}

// Check-in location types (from CRM visit reports)
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface CustomerRef {
  id: string;
  name: string;
}

export interface SalesRepCheckInLocation {
  visit_number: number;
  visit_report_id: string;
  visit_date: string;
  check_in_time: string;
  location?: Location;
  customer?: CustomerRef;
  purpose: string;
}

export interface GetSalesRepCheckInLocationsRequest {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

export interface SalesRepCheckInLocationsResponse {
  success: boolean;
  data: {
    sales_rep?: {
      id: string;
      name: string;
      email?: string;
      avatar_url?: string;
    };
    check_in_locations: SalesRepCheckInLocation[];
    total_visits: number;
    period?: {
      start: string;
      end: string;
    };
  };
}

// Product sold by sales rep (from Sales module)
export interface SalesRepProductSold {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  category_name?: string;
  total_quantity: number;
  total_revenue: number;
  total_revenue_formatted: string;
  average_price: number;
  average_price_formatted: string;
  last_sold_date?: string;
}

export interface ListSalesRepProductsRequest {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "total_quantity" | "revenue" | "name";
  order?: "asc" | "desc";
}

export interface ListSalesRepProductsResponse {
  success: boolean;
  data: SalesRepProductSold[];
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

// Customer assigned to sales rep
export interface SalesRepCustomer {
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_type?: string;
  city?: string;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  status?: string;
}

export interface ListSalesRepCustomersRequest {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "orders" | "name";
  order?: "asc" | "desc";
}

export interface ListSalesRepCustomersResponse {
  success: boolean;
  data: SalesRepCustomer[];
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
