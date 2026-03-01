// Geo Performance Report Types

/** Mode of analysis: demand-based (sales orders) or actual revenue (paid invoices) */
type GeoPerformanceMode = "sales_order" | "paid_invoice";

/** Level of geographic aggregation */
type GeoPerformanceLevel = "province" | "city";

/** Request parameters for the geo performance endpoint */
interface GeoPerformanceRequest {
  start_date?: string;
  end_date?: string;
  mode?: GeoPerformanceMode;
  sales_rep_id?: string;
  level?: GeoPerformanceLevel;
}

/** Single geographic area's aggregated metrics */
interface GeoPerformanceArea {
  area_id: string;
  area_name: string;
  parent_name?: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
}

/** Summary response from the geo performance endpoint */
interface GeoPerformanceSummary {
  areas: GeoPerformanceArea[];
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  areas_with_data: number;
  mode: GeoPerformanceMode;
  level: GeoPerformanceLevel;
}

/** Wrapper response matching the API standard */
interface GeoPerformanceResponse {
  success: boolean;
  data: GeoPerformanceSummary;
  meta?: {
    filters?: Record<string, unknown>;
  };
}

/** Sales rep option for filter dropdown */
interface GeoSalesRepOption {
  id: string;
  name: string;
  code: string;
}

/** Form data response for filter dropdowns */
interface GeoPerformanceFormData {
  sales_reps: GeoSalesRepOption[];
}

/** Wrapper response for form data */
interface GeoPerformanceFormDataResponse {
  success: boolean;
  data: GeoPerformanceFormData;
}

/** Metric used for the choropleth visualization */
type GeoPerformanceMetric = "revenue" | "frequency";
