import type {
  WidgetType,
  WidgetRegistryEntry,
  WidgetConfig,
} from "../types";

/** Complete registry of all available dashboard widgets */
export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
  total_revenue: {
    type: "total_revenue",
    category: "finance",
    defaultSize: "sm",
    titleKey: "widgets.total_revenue.title",
    descriptionKey: "widgets.total_revenue.description",
    icon: "DollarSign",
  },
  total_orders: {
    type: "total_orders",
    category: "sales",
    defaultSize: "sm",
    titleKey: "widgets.total_orders.title",
    descriptionKey: "widgets.total_orders.description",
    icon: "ShoppingCart",
  },
  total_customers: {
    type: "total_customers",
    category: "sales",
    defaultSize: "sm",
    titleKey: "widgets.total_customers.title",
    descriptionKey: "widgets.total_customers.description",
    icon: "Users",
  },
  total_products: {
    type: "total_products",
    category: "inventory",
    defaultSize: "sm",
    titleKey: "widgets.total_products.title",
    descriptionKey: "widgets.total_products.description",
    icon: "Package",
  },
  employee_count: {
    type: "employee_count",
    category: "hr",
    defaultSize: "sm",
    titleKey: "widgets.employee_count.title",
    descriptionKey: "widgets.employee_count.description",
    icon: "UserCheck",
  },
  revenue_chart: {
    type: "revenue_chart",
    category: "finance",
    defaultSize: "lg",
    titleKey: "widgets.revenue_chart.title",
    descriptionKey: "widgets.revenue_chart.description",
    icon: "TrendingUp",
  },
  costs_chart: {
    type: "costs_chart",
    category: "finance",
    defaultSize: "lg",
    titleKey: "widgets.costs_chart.title",
    descriptionKey: "widgets.costs_chart.description",
    icon: "TrendingDown",
  },
  revenue_vs_costs: {
    type: "revenue_vs_costs",
    category: "finance",
    defaultSize: "lg",
    titleKey: "widgets.revenue_vs_costs.title",
    descriptionKey: "widgets.revenue_vs_costs.description",
    icon: "BarChart3",
  },
  balance_overview: {
    type: "balance_overview",
    category: "finance",
    defaultSize: "md",
    titleKey: "widgets.balance_overview.title",
    descriptionKey: "widgets.balance_overview.description",
    icon: "Wallet",
  },
  costs_by_category: {
    type: "costs_by_category",
    category: "finance",
    defaultSize: "md",
    titleKey: "widgets.costs_by_category.title",
    descriptionKey: "widgets.costs_by_category.description",
    icon: "PieChart",
  },
  invoices_summary: {
    type: "invoices_summary",
    category: "finance",
    defaultSize: "md",
    titleKey: "widgets.invoices_summary.title",
    descriptionKey: "widgets.invoices_summary.description",
    icon: "FileText",
  },
  recent_invoices: {
    type: "recent_invoices",
    category: "finance",
    defaultSize: "lg",
    titleKey: "widgets.recent_invoices.title",
    descriptionKey: "widgets.recent_invoices.description",
    icon: "Receipt",
  },
  sales_performance: {
    type: "sales_performance",
    category: "sales",
    defaultSize: "lg",
    titleKey: "widgets.sales_performance.title",
    descriptionKey: "widgets.sales_performance.description",
    icon: "Award",
  },
  top_products: {
    type: "top_products",
    category: "sales",
    defaultSize: "lg",
    titleKey: "widgets.top_products.title",
    descriptionKey: "widgets.top_products.description",
    icon: "Star",
  },
  delivery_status: {
    type: "delivery_status",
    category: "overview",
    defaultSize: "md",
    titleKey: "widgets.delivery_status.title",
    descriptionKey: "widgets.delivery_status.description",
    icon: "Truck",
  },
  geographic_overview: {
    type: "geographic_overview",
    category: "geographic",
    defaultSize: "xl",
    titleKey: "widgets.geographic_overview.title",
    descriptionKey: "widgets.geographic_overview.description",
    icon: "Map",
  },
  warehouse_overview: {
    type: "warehouse_overview",
    category: "inventory",
    defaultSize: "lg",
    titleKey: "widgets.warehouse_overview.title",
    descriptionKey: "widgets.warehouse_overview.description",
    icon: "Warehouse",
  },
  // Composite widgets for the reference Sales Dashboard layout
  revenue_bar_chart: {
    type: "revenue_bar_chart",
    category: "finance",
    defaultSize: "xl",
    titleKey: "revenueChart.title",
    descriptionKey: "revenueChart.subtitle",
    icon: "BarChart3",
  },
  stat_summary_balance: {
    type: "stat_summary_balance",
    category: "finance",
    defaultSize: "sm",
    titleKey: "stats.totalBalance",
    descriptionKey: "stats.totalBalance",
    icon: "Wallet",
  },
  stat_summary_revenue: {
    type: "stat_summary_revenue",
    category: "finance",
    defaultSize: "sm",
    titleKey: "stats.totalRevenue",
    descriptionKey: "stats.totalRevenue",
    icon: "TrendingUp",
  },
  stat_summary_expense: {
    type: "stat_summary_expense",
    category: "finance",
    defaultSize: "sm",
    titleKey: "stats.totalExpense",
    descriptionKey: "stats.totalExpense",
    icon: "TrendingDown",
  },
  stat_summary_orders: {
    type: "stat_summary_orders",
    category: "sales",
    defaultSize: "sm",
    titleKey: "stats.totalOrders",
    descriptionKey: "stats.totalOrders",
    icon: "ShoppingCart",
  },
  best_selling: {
    type: "best_selling",
    category: "sales",
    defaultSize: "md",
    titleKey: "bestSelling.title",
    descriptionKey: "bestSelling.subtitle",
    icon: "Star",
  },
  track_orders: {
    type: "track_orders",
    category: "sales",
    defaultSize: "md",
    titleKey: "trackOrders.title",
    descriptionKey: "trackOrders.subtitle",
    icon: "Truck",
  },
};

/** Default layout for new users — mirrors the reference Sales Dashboard design */
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "w-1", type: "revenue_bar_chart",    title: "", size: "xl", order: 0, visible: true },
  { id: "w-2", type: "stat_summary_balance", title: "", size: "sm", order: 1, visible: true },
  { id: "w-3", type: "stat_summary_revenue", title: "", size: "sm", order: 2, visible: true },
  { id: "w-4", type: "stat_summary_expense", title: "", size: "sm", order: 3, visible: true },
  { id: "w-5", type: "stat_summary_orders",  title: "", size: "sm", order: 4, visible: true },
  { id: "w-6", type: "best_selling",         title: "", size: "md", order: 5, visible: true },
  { id: "w-7", type: "track_orders",         title: "", size: "md", order: 6, visible: true },
];

/** Widget types grouped by category for the picker UI */
export function getWidgetsByCategory() {
  const grouped: Record<string, WidgetRegistryEntry[]> = {};
  for (const entry of Object.values(WIDGET_REGISTRY)) {
    if (!grouped[entry.category]) grouped[entry.category] = [];
    grouped[entry.category].push(entry);
  }
  return grouped;
}
