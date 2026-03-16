"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { WidgetConfig, DashboardOverviewData, KpiCardData } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { ChartWidget } from "./chart-widget";
import { BalanceWidget } from "./balance-widget";
import { CostsCategoryWidget } from "./costs-category-widget";
import { InvoicesSummaryWidget } from "./invoices-summary-widget";
import { RecentInvoicesWidget } from "./recent-invoices-widget";
import { DeliveryWidget } from "./delivery-widget";
import { SalesPerformanceWidget } from "./sales-performance-widget";
import { GeoWidget } from "./geo-widget";
import { WarehouseWidget } from "./warehouse-widget";
import { RevenueBarChartCard } from "./revenue-bar-chart-card";
import { StatSummaryCard } from "./stat-summary-card";
import { BestSellingCard } from "./best-selling-card";
import { TrackOrderCard } from "./track-order-card";
import { PendingApprovalsSalesWidget } from "./pending-approvals-sales-widget";
import { PendingApprovalsPurchaseWidget } from "./pending-approvals-purchase-widget";
import { WIDGET_REGISTRY } from "../config/widget-registry";

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

interface WidgetRendererProps {
  readonly widget: WidgetConfig;
  readonly data?: DashboardOverviewData;
  readonly isLoading?: boolean;
}

export function WidgetRenderer({ widget, data, isLoading }: WidgetRendererProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  // Always call hooks unconditionally before any early returns
  const canView = useUserPermission(registry?.permission ?? "");

  if (!registry) return null;
  if (!canView) return null;

  // Compute total expense from costs_by_category (used by stat_summary_expense)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const totalExpense = useMemo<KpiCardData>(() => {
    const items = data?.costs_by_category ?? [];
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(total);
    return { value: total, formatted };
  }, [data?.costs_by_category]);

  // Keep dashboard figures readable and consistent by avoiding compact abbreviations.
  const revenueSummary = useMemo<KpiCardData | undefined>(() => {
    if (!data?.kpi?.total_revenue) return undefined;
    return {
      ...data.kpi.total_revenue,
      formatted: formatIDR(data.kpi.total_revenue.value),
    };
  }, [data?.kpi?.total_revenue]);

  const ordersSummary = useMemo<KpiCardData | undefined>(() => {
    if (!data?.kpi?.total_orders) return undefined;
    return {
      ...data.kpi.total_orders,
      formatted: formatNumber(data.kpi.total_orders.value),
    };
  }, [data?.kpi?.total_orders]);

  const balanceSummary = useMemo<KpiCardData | undefined>(() => {
    if (!data?.balance_overview) return undefined;
    return {
      ...data.balance_overview,
      formatted: formatIDR(data.balance_overview.value),
    };
  }, [data?.balance_overview]);

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
      return <StatSummaryCard label={t("stats.totalBalance")} data={balanceSummary} />;
    case "stat_summary_revenue":
      return <StatSummaryCard label={t("stats.totalRevenue")} data={revenueSummary} />;
    case "stat_summary_expense":
      return <StatSummaryCard label={t("stats.totalExpense")} data={totalExpense} />;
    case "stat_summary_orders":
      return <StatSummaryCard label={t("stats.totalOrders")} data={ordersSummary} />;
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
    case "pending_approvals_sales":
      return <PendingApprovalsSalesWidget />;
    case "pending_approvals_purchase":
      return <PendingApprovalsPurchaseWidget />;

    default:
      return null;
  }
}
