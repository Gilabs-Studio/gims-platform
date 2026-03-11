"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { WidgetConfig, DashboardOverviewData, KpiCardData } from "../types";
import { ChartWidget } from "./chart-widget";
import { BalanceWidget } from "./balance-widget";
import { CostsCategoryWidget } from "./costs-category-widget";
import { InvoicesSummaryWidget } from "./invoices-summary-widget";
import { RecentInvoicesWidget } from "./recent-invoices-widget";
import { DeliveryWidget } from "./delivery-widget";
import { SalesPerformanceWidget } from "./sales-performance-widget";
import { TopProductsWidget } from "./top-products-widget";
import { GeoWidget } from "./geo-widget";
import { WarehouseWidget } from "./warehouse-widget";
import { RevenueBarChartCard } from "./revenue-bar-chart-card";
import { StatSummaryCard } from "./stat-summary-card";
import { BestSellingCard } from "./best-selling-card";
import { TrackOrderCard } from "./track-order-card";
import { WIDGET_REGISTRY } from "../config/widget-registry";

interface WidgetRendererProps {
  readonly widget: WidgetConfig;
  readonly data?: DashboardOverviewData;
  readonly isLoading?: boolean;
}

export function WidgetRenderer({ widget, data, isLoading }: WidgetRendererProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  if (!registry) return null;

  // Compute total expense from costs_by_category (used by stat_summary_expense)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const totalExpense = useMemo<KpiCardData>(() => {
    const items = data?.costs_by_category ?? [];
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(total);
    return { value: total, formatted };
  }, [data?.costs_by_category]);

  switch (widget.type) {
    // ---- Legacy KPI widgets (rendered as StatSummaryCard for UI consistency) ----
    case "total_revenue":
      return <StatSummaryCard label={t("widgets.total_revenue.title")} data={data?.kpi?.total_revenue} />;
    case "total_orders":
      return <StatSummaryCard label={t("widgets.total_orders.title")} data={data?.kpi?.total_orders} />;
    case "total_customers":
      return <StatSummaryCard label={t("widgets.total_customers.title")} data={data?.kpi?.total_customers} />;
    case "total_products":
      return <StatSummaryCard label={t("widgets.total_products.title")} data={data?.kpi?.total_products} />;
    case "employee_count":
      return <StatSummaryCard label={t("widgets.employee_count.title")} data={data?.kpi?.employee_count} />;

    // ---- Legacy chart widgets ----
    case "revenue_chart":
      return <ChartWidget widgetType="revenue_chart" data={data?.revenue_chart} />;
    case "costs_chart":
      return <ChartWidget widgetType="costs_chart" data={data?.costs_chart} />;
    case "revenue_vs_costs":
      return <ChartWidget widgetType="revenue_vs_costs" data={data?.revenue_vs_costs} />;
    case "balance_overview":
      return <BalanceWidget data={data?.balance_overview} />;
    case "costs_by_category":
      return <CostsCategoryWidget data={data?.costs_by_category} />;
    case "invoices_summary":
      return <InvoicesSummaryWidget data={data?.invoices_summary} />;
    case "recent_invoices":
      return <RecentInvoicesWidget data={data?.recent_invoices} />;
    case "delivery_status":
      return <DeliveryWidget data={data?.delivery_status} />;
    case "sales_performance":
      return <SalesPerformanceWidget data={data?.sales_performance} />;
    case "top_products":
      return <TopProductsWidget data={data?.top_products} />;
    case "geographic_overview":
      return <GeoWidget data={data?.geographic_overview} />;
    case "warehouse_overview":
      return <WarehouseWidget data={data?.warehouse_overview} />;

    // ---- New composite widgets (reference Sales Dashboard) ----
    case "revenue_bar_chart":
      return (
        <RevenueBarChartCard
          revenueData={data?.revenue_chart}
          costsData={data?.costs_chart}
          isLoading={isLoading}
        />
      );
    case "stat_summary_balance":
      return <StatSummaryCard label={t("stats.totalBalance")} data={data?.balance_overview} />;
    case "stat_summary_revenue":
      return <StatSummaryCard label={t("stats.totalRevenue")} data={data?.kpi?.total_revenue} />;
    case "stat_summary_expense":
      return <StatSummaryCard label={t("stats.totalExpense")} data={totalExpense} />;
    case "stat_summary_orders":
      return <StatSummaryCard label={t("stats.totalOrders")} data={data?.kpi?.total_orders} />;
    case "best_selling":
      return <BestSellingCard data={data?.top_products} isLoading={isLoading} />;
    case "track_orders":
      return (
        <TrackOrderCard
          deliveryStatus={data?.delivery_status}
          recentInvoices={data?.recent_invoices}
          isLoading={isLoading}
        />
      );

    default:
      return null;
  }
}
