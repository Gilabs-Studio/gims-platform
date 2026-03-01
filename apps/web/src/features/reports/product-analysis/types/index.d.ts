// Product Analysis Report types
// Data sourced from: Products, Sales Orders, Sales Order Items, Customers, Employees

export interface ProductPerformance {
  product_id: string;
  product_code: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  category_name?: string;
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  avg_price: number;
  avg_price_formatted: string;
  // Mapped id for DataTable compatibility
  id?: string;
}

export interface ListProductPerformanceRequest {
  search?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "qty" | "orders" | "name";
  order?: "asc" | "desc";
}

export interface ListProductPerformanceResponse {
  success: boolean;
  data: ProductPerformance[];
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

export interface MonthlyProductSalesData {
  month: number;
  month_name: string;
  year: number;
  total_revenue: number;
  total_qty: number;
  total_orders: number;
}

export interface MonthlyProductSalesOverviewData {
  monthly_data: MonthlyProductSalesData[];
  total_revenue: number;
  total_qty: number;
  total_orders: number;
}

export interface MonthlyProductSalesResponse {
  success: boolean;
  data: MonthlyProductSalesOverviewData;
}

export interface ProductDetailStatistics {
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  avg_price: number;
  avg_price_formatted: string;
  period_comparison?: {
    revenue_change: number;
    qty_change: number;
    orders_change: number;
  };
}

export interface ProductDetail {
  product_id: string;
  product_code: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  category_name?: string;
  brand_name?: string;
  selling_price: number;
  cost_price: number;
  current_stock: number;
  statistics?: ProductDetailStatistics;
}

export interface ProductDetailResponse {
  success: boolean;
  data: ProductDetail;
}

export interface GetProductDetailRequest {
  start_date?: string;
  end_date?: string;
}

// Top customers for a product
export interface ProductCustomer {
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_type?: string;
  city_name?: string;
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
}

export interface ListProductCustomersRequest {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "qty" | "orders" | "name";
  order?: "asc" | "desc";
}

export interface ListProductCustomersResponse {
  success: boolean;
  data: ProductCustomer[];
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

// Top sales reps for a product
export interface ProductSalesRep {
  employee_id: string;
  employee_code: string;
  name: string;
  avatar_url?: string;
  position_name?: string;
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
}

export interface ListProductSalesRepsRequest {
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "qty" | "orders" | "name";
  order?: "asc" | "desc";
}

export interface ListProductSalesRepsResponse {
  success: boolean;
  data: ProductSalesRep[];
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

// Monthly trend for a specific product
export interface ProductMonthlyTrendData {
  month: number;
  month_name: string;
  year: number;
  total_revenue: number;
  total_qty: number;
  total_orders: number;
}

export interface ProductMonthlyTrendResponse {
  success: boolean;
  data: {
    product_id: string;
    product_name: string;
    monthly_data: ProductMonthlyTrendData[];
  };
}

export interface GetProductMonthlyTrendRequest {
  start_date?: string;
  end_date?: string;
}

// --- Category Performance ---

export interface CategoryPerformance {
  category_id: string;
  category_name: string;
  product_count: number;
  total_qty: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_orders: number;
  avg_price: number;
  avg_price_formatted: string;
}

export interface ListCategoryPerformanceRequest {
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: "revenue" | "qty" | "orders" | "name" | "products";
  order?: "asc" | "desc";
}

export interface ListCategoryPerformanceResponse {
  success: boolean;
  data: CategoryPerformance[];
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
