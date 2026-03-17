export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SupplierResearchFilters {
  start_date?: string;
  end_date?: string;
  category_ids?: string[];
  min_purchase_value?: number;
  max_purchase_value?: number;
  search?: string;
}

export interface SupplierResearchKpis {
  total_suppliers: number;
  active_suppliers: number;
  total_purchase_value: number;
  total_purchase_value_formatted?: string;
  average_lead_time_days: number;
}

export interface SupplierResearchKpisResponse {
  success: boolean;
  data: SupplierResearchKpis;
}

export interface SupplierPurchaseVolumeItem {
  supplier_id: string;
  supplier_code?: string;
  supplier_name: string;
  category_name?: string;
  total_purchase_value: number;
  total_purchase_value_formatted?: string;
  total_purchase_orders: number;
  dependency_score: number;
}

export interface ListSupplierPurchaseVolumeRequest extends SupplierResearchFilters {
  page?: number;
  per_page?: number;
  sort_by?: "purchase_value" | "orders" | "name" | "dependency";
  order?: "asc" | "desc";
}

export interface ListSupplierPurchaseVolumeResponse {
  success: boolean;
  data: SupplierPurchaseVolumeItem[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface SupplierDeliveryTimeItem {
  supplier_id: string;
  supplier_name: string;
  average_lead_time_days: number;
  supplier_on_time_rate: number;
  late_delivery_count: number;
}

export interface ListSupplierDeliveryTimeRequest extends SupplierResearchFilters {
  page?: number;
  per_page?: number;
  sort_by?: "lead_time" | "on_time_rate" | "late_count" | "name";
  order?: "asc" | "desc";
}

export interface ListSupplierDeliveryTimeResponse {
  success: boolean;
  data: SupplierDeliveryTimeItem[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface SupplierSpendTrendPoint {
  period: string;
  total_purchase_value: number;
}

export interface SupplierSpendTrendResponse {
  success: boolean;
  data: {
    interval: "daily" | "weekly" | "monthly";
    timeline: SupplierSpendTrendPoint[];
  };
}

export interface ListSuppliersTableRequest extends SupplierResearchFilters {
  tab?: "top_spenders" | "slow_delivery" | "reliability";
  page?: number;
  per_page?: number;
  sort_by?: string;
  order?: "asc" | "desc";
}

export interface SupplierTableRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  category_name?: string;
  total_purchase_value?: number;
  total_purchase_value_formatted?: string;
  total_purchase_orders?: number;
  average_lead_time_days?: number;
  late_delivery_count?: number;
  supplier_on_time_rate?: number;
  dependency_score?: number;
}

export interface ListSuppliersTableResponse {
  success: boolean;
  data: SupplierTableRow[];
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface SupplierDetailResponse {
  success: boolean;
  data: {
    supplier_id: string;
    supplier_code?: string;
    supplier_name: string;
    category_name?: string;
    country?: string;
    total_purchase_value: number;
    total_purchase_value_formatted?: string;
    total_purchase_orders: number;
    average_lead_time_days: number;
    supplier_on_time_rate: number;
    late_delivery_count: number;
    dependency_score: number;
  };
}
