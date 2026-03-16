// Dashboard Widget System Types

/** Available widget categories for the widget picker */
export type WidgetCategory =
  | "overview"
  | "finance"
  | "sales"
  | "purchase"
  | "inventory"
  | "geographic"
  | "hr";

/** Widget size presets for the grid */
export type WidgetSize = "sm" | "md" | "lg" | "xl";

/** Number of columns a widget occupies in the 4-column grid */
export type WidgetColSpan = 1 | 2 | 3 | 4;

/** Number of rows a widget occupies (controls height) */
export type WidgetRowSpan = 1 | 2 | 3;

/** Widget configuration stored per-user */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  /** Column span override (1–4). Takes precedence over `size` when present. */
  colSpan?: WidgetColSpan;
  /** Row span override (1–3). Controls widget height. Defaults to 1 if absent. */
  rowSpan?: WidgetRowSpan;
  order: number;
  visible: boolean;
}

/** All available widget types in the system */
export type WidgetType =
  | "total_revenue"
  | "total_orders"
  | "total_customers"
  | "total_products"
  | "revenue_chart"
  | "costs_chart"
  | "revenue_vs_costs"
  | "invoices_summary"
  | "recent_invoices"
  | "balance_overview"
  | "costs_by_category"
  | "sales_performance"
  | "geographic_overview"
  | "warehouse_overview"
  | "employee_count"
  | "delivery_status"
  // New composite widget types for the reference Sales Dashboard layout
  | "revenue_bar_chart"
  | "stat_summary_balance"
  | "stat_summary_revenue"
  | "stat_summary_expense"
  | "stat_summary_orders"
  | "best_selling"
  | "track_orders"
  | "track_purchase_orders"
  // Approval list widgets
  | "pending_approvals_sales"
  | "pending_approvals_purchase";

/** Widget registry entry - metadata describing a widget */
export interface WidgetRegistryEntry {
  type: WidgetType;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  /** Default column span in the 4-column grid. */
  defaultColSpan: WidgetColSpan;
  /** Default row span (height). */
  defaultRowSpan: WidgetRowSpan;
  /** Minimum column span — prevents the widget from being too narrow for its content. */
  minColSpan?: WidgetColSpan;
  /** Minimum row span. */
  minRowSpan?: WidgetRowSpan;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  /** Permission code required to view this widget (e.g. "sales_order.read"). Omit for always-visible widgets. */
  permission?: string;
}

/** Dashboard layout persisted to localStorage */
export interface DashboardLayout {
  widgets: WidgetConfig[];
  updatedAt: string;
}

/** API response for a saved dashboard layout */
export interface DashboardLayoutApiResponse {
  success: boolean;
  data: {
    dashboard_type: string;
    layout_json: string;
  } | null;
}

/** Global date filter for the dashboard */
export interface DashboardDateFilter {
  from: string | null;
  to: string | null;
  year: number;
}

// ---- API Response Types ----

/** KPI summary card data */
export interface KpiCardData {
  value: number;
  formatted: string;
  change_percent?: number;
  previous_value?: number;
  previous_formatted?: string;
}

/** Chart series with period labels */
export interface ChartSeriesData {
  label: string;
  data: number[];
  formatted: string[];
}

/** Period-based chart */
export interface PeriodChartData {
  series: ChartSeriesData[];
  period: string[];
}

/** Category cost breakdown */
export interface CostCategoryItem {
  category: string;
  amount: number;
  amount_formatted: string;
  percentage: number;
}

/** Invoice row */
export interface InvoiceRow {
  id: string;
  customer_id?: string;
  company: string;
  issue_date: string;
  contact: string;
  value: number;
  value_formatted: string;
  status: "unpaid" | "paid" | "overdue";
}

/** Invoice summary counts */
export interface InvoiceSummaryData {
  total: number;
  unpaid: number;
  paid: number;
  overdue: number;
}

/** Sales performance row */
export interface SalesPerformanceRow {
  id: string;
  name: string;
  revenue: number;
  revenue_formatted: string;
  orders: number;
  target_percent: number;
}

/** Top product row */
export interface TopProductRow {
  id: string;
  name: string;
  sku: string;
  quantity_sold: number;
  revenue: number;
  revenue_formatted: string;
}

/** Delivery status breakdown */
export interface DeliveryStatusData {
  total: number;
  pending: number;
  in_transit: number;
  delivered: number;
  change_percent?: number;
}

/** Geographic overview data for choropleth */
export interface GeoOverviewData {
  regions: GeoRegionData[];
  total_value: number;
  total_formatted: string;
}

export interface GeoRegionData {
  name: string;
  code: string;
  value: number;
  formatted: string;
  count: number;
}

/** Warehouse overview */
export interface WarehouseOverviewData {
  warehouses: WarehouseItem[];
  total_stock_value: number;
  total_stock_formatted: string;
}

export interface WarehouseItem {
  id: string;
  name: string;
  location: string;
  stock_value: number;
  stock_formatted: string;
  item_count: number;
  utilization_percent: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

/** Dashboard overview API response (aggregated) */
export interface DashboardOverviewResponse {
  success: boolean;
  data: DashboardOverviewData;
  timestamp: string;
  request_id: string;
}

export interface DashboardOverviewData {
  kpi: {
    total_revenue: KpiCardData;
    total_orders: KpiCardData;
    total_customers: KpiCardData;
    total_products: KpiCardData;
    employee_count: KpiCardData;
  };
  revenue_chart: PeriodChartData;
  costs_chart: PeriodChartData;
  revenue_vs_costs: PeriodChartData;
  balance_overview: KpiCardData & {
    chart_data: Array<{ period: string; value: number; formatted: string }>;
  };
  costs_by_category: CostCategoryItem[];
  invoices_summary: InvoiceSummaryData;
  recent_invoices: InvoiceRow[];
  sales_performance: SalesPerformanceRow[];
  top_products: TopProductRow[];
  delivery_status: DeliveryStatusData;
  geographic_overview: GeoOverviewData;
  warehouse_overview: WarehouseOverviewData;
}

