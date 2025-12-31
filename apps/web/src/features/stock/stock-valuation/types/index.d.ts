export interface Product {
  id: number;
  name: string;
  code: string;
  cost_price: number;
  selling_price: number;
  image_url: string;
}

export interface Warehouse {
  id: number;
  name: string;
}

export interface StockValuation {
  id: number;
  product: Product;
  warehouse: Warehouse;
  movement_type: "IN" | "OUT";
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference_type: "PO" | "SO" | "ADJUSTMENT" | "TRANSFER" | "RETURN" | null;
  reference_id: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StockValuationStats {
  total_movements: number;
  total_in_quantity: number;
  total_out_quantity: number;
  total_in_value: number;
  total_out_value: number;
  net_quantity: number;
  net_value: number;
  average_unit_cost: number;
  date_range: string;
}

export interface StockValuationTimelineData {
  date: string;
  hpp_average: number;
  total_quantity: number;
  total_value: number;
  movement_count: number;
}

export interface StockValuationTimeline {
  data: StockValuationTimelineData[];
  group_by: string;
  date_range: string;
}

export interface StockValuationMeta {
  date_range: {
    start_date: string;
    end_date: string;
  };
  pagination: {
    page: number;
    limit: number;
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
}

export interface StockValuationListResponse {
  success: boolean;
  data: StockValuation[];
  meta: StockValuationMeta;
}

export interface StockValuationStatsResponse {
  success: boolean;
  data: StockValuationStats;
}

export interface StockValuationTimelineResponse {
  success: boolean;
  data: {
    data: StockValuationTimeline;
  };
}
