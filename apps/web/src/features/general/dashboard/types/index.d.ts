// Dashboard Overview Types
export interface DashboardOverview {
  deliveries?: DeliveriesMetrics;
  revenue_costs?: RevenueCostsData;
  balance?: BalanceData;
  costs_by_category?: CostsByCategoryItem[];
  invoices_summary?: InvoiceSummary;
}

export interface DeliveriesMetrics {
  total?: number;
  pending?: number;
  completed?: number;
  total_formatted?: string;
  pending_formatted?: string;
  completed_formatted?: string;
  change_percent?: number;
}

export interface RevenueCostsData {
  revenue?: RevenueCostsSeries;
  costs?: RevenueCostsSeries;
  period?: string[];
}

export interface RevenueCostsSeries {
  label?: string;
  data?: number[];
  formatted?: string[];
}

export interface BalanceData {
  current?: number;
  previous?: number;
  change_percent?: number;
  current_formatted?: string;
  previous_formatted?: string;
  chart_data?: BalanceChartPoint[];
}

export interface BalanceChartPoint {
  period?: string;
  value?: number;
  formatted?: string;
}

export interface CostsByCategoryItem {
  category?: string;
  amount?: number;
  amount_formatted?: string;
  percentage?: number;
  color?: string;
}

// Invoices Types
export interface Invoice {
  id: string;
  company: string;
  issue_date: string;
  contact: string;
  value: number;
  value_formatted: string;
  status: "unpaid" | "paid" | "recent_request";
}

export interface InvoiceSummary {
  total?: number;
  unpaid?: number;
  paid?: number;
  recent_requests?: number;
  total_formatted?: string;
  unpaid_formatted?: string;
  paid_formatted?: string;
  recent_requests_formatted?: string;
}

export interface ListInvoicesResponse {
  success: boolean;
  data: Invoice[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    summary?: InvoiceSummary;
  };
  timestamp: string;
  request_id: string;
}

export interface DashboardOverviewResponse {
  success: boolean;
  data: DashboardOverview;
  timestamp: string;
  request_id: string;
}

