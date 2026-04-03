"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Timer,
  CalendarClock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Percent,
  Building2,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Gauge,
  Truck,
  Activity as ActivityIcon,
  Clock,
} from "lucide-react";
import type { WidgetConfig, KpiCardData, WidgetType, OwnerKpiMetric } from "../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatCurrency } from "@/lib/utils";
import { useDashboardWidgetOverview, isOverviewWidget, isOwnerKpiWidget } from "../hooks/use-dashboard";
import { useOwnerKpi } from "../hooks/use-owner-kpi";
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
import { TrackPurchaseOrderCard } from "./track-purchase-order-card";
import { PendingApprovalsSalesWidget } from "./pending-approvals-sales-widget";
import { PendingApprovalsPurchaseWidget } from "./pending-approvals-purchase-widget";
import { TravelPlannerWidget } from "./travel-planner-widget";
import { OwnerKpiCard } from "./owner-kpi-card";
import { OwnerIntelligenceWidget } from "./owner-intelligence-widget";
import { OpexCapexWidget } from "./opex-capex-widget";
import { WidgetAsyncState } from "./widget-async-state";
import { WIDGET_REGISTRY } from "../config/widget-registry";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

interface WidgetRendererProps {
  readonly widget: WidgetConfig;
}

function isNonOverviewWidget(type: WidgetType): boolean {
  return (
    type === "track_orders" ||
    type === "track_purchase_orders" ||
    type === "pending_approvals_sales" ||
    type === "pending_approvals_purchase"
  );
}

// Tier mapping for visual priority
const TIER_1_WIDGETS = new Set(["kpi_ccc", "kpi_dio", "kpi_ar_days", "kpi_ap_days"]);

const KPI_ICONS: Record<string, ReactNode> = {
  kpi_ccc: <Timer className="h-4 w-4" />,
  kpi_dio: <CalendarClock className="h-4 w-4" />,
  kpi_ar_days: <ArrowDownToLine className="h-4 w-4" />,
  kpi_ap_days: <ArrowUpFromLine className="h-4 w-4" />,
  kpi_roe: <Percent className="h-4 w-4" />,
  kpi_roa: <Building2 className="h-4 w-4" />,
  kpi_net_profit_margin: <TrendingUp className="h-4 w-4" />,
  kpi_gross_profit_margin: <BarChart3 className="h-4 w-4" />,
  kpi_inventory_turnover: <RefreshCw className="h-4 w-4" />,
  kpi_asset_turnover: <Gauge className="h-4 w-4" />,
  kpi_cost_per_delivery: <Truck className="h-4 w-4" />,
  kpi_utilization_rate: <ActivityIcon className="h-4 w-4" />,
  kpi_otd_rate: <Clock className="h-4 w-4" />,
};

export function WidgetRenderer({ widget }: WidgetRendererProps) {
  const t = useTranslations("dashboard");
  const registry = WIDGET_REGISTRY[widget.type];
  // Always call hooks unconditionally before any early returns
  const canView = useUserPermission(registry?.permission ?? "");
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useDashboardWidgetOverview(widget.type, {
    enabled: canView && isOverviewWidget(widget.type) && !isOwnerKpiWidget(widget.type),
  });

  const ownerKpi = useOwnerKpi({
    enabled: canView && isOwnerKpiWidget(widget.type),
  });

  // Keep hooks order stable across renders to satisfy React hook rules.
  const totalExpense = useMemo<KpiCardData>(() => {
    const items = data?.costs_by_category ?? [];
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const formatted = formatCurrency(total);
    return { value: total, formatted };
  }, [data?.costs_by_category]);

  // Keep dashboard figures readable and consistent by avoiding compact abbreviations.
  const revenueSummary = useMemo<KpiCardData | undefined>(() => {
    if (!data?.kpi?.total_revenue) return undefined;
    return {
      ...data.kpi.total_revenue,
      formatted: formatCurrency(data.kpi.total_revenue.value),
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
      formatted: formatCurrency(data.balance_overview.value),
    };
  }, [data?.balance_overview]);

  if (!registry) return null;
  if (!canView) return null;

  // ── Non-overview widgets (self-fetching) ──
  if (isNonOverviewWidget(widget.type)) {
    switch (widget.type) {
      case "track_orders":
        return <TrackOrderCard />;
      case "track_purchase_orders":
        return <TrackPurchaseOrderCard />;
      case "pending_approvals_sales":
        return <PendingApprovalsSalesWidget />;
      case "pending_approvals_purchase":
        return <PendingApprovalsPurchaseWidget />;
      default:
        return null;
    }
  }

  // ── Owner KPI widgets ──
  if (isOwnerKpiWidget(widget.type)) {
    const kpiData = ownerKpi?.data;

    // Special full-width widgets
    if (widget.type === "owner_intelligence") {
      return (
        <WidgetAsyncState
          isLoading={Boolean(ownerKpi?.isLoading)}
          isError={Boolean(ownerKpi?.isError)}
          onRetry={() => {
            void ownerKpi?.refetch();
          }}
        >
          <OwnerIntelligenceWidget data={kpiData?.intelligence} />
        </WidgetAsyncState>
      );
    }

    if (widget.type === "kpi_opex_vs_capex") {
      return (
        <WidgetAsyncState
          isLoading={Boolean(ownerKpi?.isLoading)}
          isError={Boolean(ownerKpi?.isError)}
          onRetry={() => {
            void ownerKpi?.refetch();
          }}
        >
          <OpexCapexWidget data={kpiData?.cost_structure} />
        </WidgetAsyncState>
      );
    }

    // Individual KPI cards
    const icon = KPI_ICONS[widget.type];
    if (!icon) {
      return null;
    }

    // Map widget type to the correct metric from owner KPI data
    const metricMap: Record<string, () => OwnerKpiMetric | undefined> = {
      kpi_roe: () => kpiData?.profitability?.roe,
      kpi_net_profit_margin: () => kpiData?.profitability?.net_profit_margin,
      kpi_gross_profit_margin: () => kpiData?.profitability?.gross_profit_margin,
      kpi_inventory_turnover: () => kpiData?.inventory?.inventory_turnover,
      kpi_dio: () => kpiData?.inventory?.dio,
      kpi_ar_days: () => kpiData?.cashflow?.ar_days,
      kpi_ap_days: () => kpiData?.cashflow?.ap_days,
      kpi_ccc: () => kpiData?.cashflow?.ccc,
      kpi_cost_per_delivery: () => kpiData?.logistics?.cost_per_delivery,
      kpi_utilization_rate: () => kpiData?.logistics?.utilization_rate,
      kpi_otd_rate: () => kpiData?.logistics?.otd_rate,
      kpi_roa: () => kpiData?.asset?.roa,
      kpi_asset_turnover: () => kpiData?.asset?.asset_turnover,
    };

    const getMetric = metricMap[widget.type];
    const metric = getMetric?.();

    const formulaKey = `ownerKpi.metrics.${widget.type}.formula` as const;
    const purposeKey = `ownerKpi.metrics.${widget.type}.purpose` as const;

    if (!metric) {
      return (
        <WidgetAsyncState
          isLoading={Boolean(ownerKpi?.isLoading)}
          isError={Boolean(ownerKpi?.isError)}
          onRetry={() => {
            void ownerKpi?.refetch();
          }}
        >
          <OwnerKpiCard
            title={t(registry.titleKey as Parameters<typeof t>[0])}
            metric={{
              value: 0,
              formatted: "—",
              status: "warning",
              status_label: "No Data",
              unit: "",
            }}
            formula={t(formulaKey as Parameters<typeof t>[0])}
            purpose={t(purposeKey as Parameters<typeof t>[0])}
            icon={icon}
          />
        </WidgetAsyncState>
      );
    }

    return (
      <WidgetAsyncState
        isLoading={Boolean(ownerKpi?.isLoading)}
        isError={Boolean(ownerKpi?.isError)}
        onRetry={() => {
          void ownerKpi?.refetch();
        }}
      >
        <OwnerKpiCard
          title={t(registry.titleKey as Parameters<typeof t>[0])}
          metric={metric}
          formula={t(formulaKey as Parameters<typeof t>[0])}
          purpose={t(purposeKey as Parameters<typeof t>[0])}
          icon={icon}
        />
      </WidgetAsyncState>
    );
  }

  // ── Existing widgets (legacy) ──
  let content: ReactNode = null;

  switch (widget.type) {
    // ---- Legacy KPI widgets (rendered as StatSummaryCard for UI consistency) ----
    case "total_revenue":
      content = <StatSummaryCard label={t("widgets.total_revenue.title")} data={data?.kpi?.total_revenue} />;
      break;
    case "total_orders":
      content = <StatSummaryCard label={t("widgets.total_orders.title")} data={data?.kpi?.total_orders} />;
      break;
    case "total_customers":
      content = <StatSummaryCard label={t("widgets.total_customers.title")} data={data?.kpi?.total_customers} />;
      break;
    case "total_products":
      content = <StatSummaryCard label={t("widgets.total_products.title")} data={data?.kpi?.total_products} />;
      break;
    case "employee_count":
      content = <StatSummaryCard label={t("widgets.employee_count.title")} data={data?.kpi?.employee_count} />;
      break;

    // ---- Legacy chart widgets ----
    case "revenue_chart":
      content = <ChartWidget widgetType="revenue_chart" data={data?.revenue_chart} />;
      break;
    case "costs_chart":
      content = <ChartWidget widgetType="costs_chart" data={data?.costs_chart} />;
      break;
    case "revenue_vs_costs":
      content = <ChartWidget widgetType="revenue_vs_costs" data={data?.revenue_vs_costs} />;
      break;
    case "balance_overview":
      content = <BalanceWidget data={data?.balance_overview} />;
      break;
    case "costs_by_category":
      content = <CostsCategoryWidget data={data?.costs_by_category} />;
      break;
    case "invoices_summary":
      content = <InvoicesSummaryWidget data={data?.invoices_summary} />;
      break;
    case "recent_invoices":
      content = <RecentInvoicesWidget data={data?.recent_invoices} />;
      break;
    case "delivery_status":
      content = <DeliveryWidget data={data?.delivery_status} />;
      break;
    case "sales_performance":
      content = <SalesPerformanceWidget data={data?.sales_performance} />;
      break;
    case "geographic_overview":
      content = <GeoWidget data={data?.geographic_overview} />;
      break;
    case "warehouse_overview":
      content = <WarehouseWidget data={data?.warehouse_overview} />;
      break;

    // ---- New composite widgets (reference Sales Dashboard) ----
    case "revenue_bar_chart":
      content = (
        <RevenueBarChartCard
          revenueData={data?.revenue_chart}
          costsData={data?.costs_chart}
        />
      );
      break;
    case "stat_summary_balance":
      content = <StatSummaryCard label={t("stats.totalBalance")} data={balanceSummary} />;
      break;
    case "stat_summary_revenue":
      content = <StatSummaryCard label={t("stats.totalRevenue")} data={revenueSummary} />;
      break;
    case "stat_summary_expense":
      content = <StatSummaryCard label={t("stats.totalExpense")} data={totalExpense} />;
      break;
    case "stat_summary_orders":
      content = <StatSummaryCard label={t("stats.totalOrders")} data={ordersSummary} />;
      break;
    case "best_selling":
      content = <BestSellingCard data={data?.top_products} />;
      break;
    case "travel_planner_overview":
      content = <TravelPlannerWidget />;
      break;

    default:
      content = null;
      break;
  }

  if (!content) return null;

  return (
    <WidgetAsyncState
      isLoading={isLoading}
      isError={isError}
      onRetry={() => {
        void refetch();
      }}
    >
      {content}
    </WidgetAsyncState>
  );
}

