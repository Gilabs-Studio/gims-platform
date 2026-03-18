"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PageMotion } from "@/components/motion";
import {
  ArrowLeft,
  Package,
  Tag,
  Layers,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Hash,
  ShoppingCart,
  BarChart3,
  ImageOff,
} from "lucide-react";
import { useProductDetail } from "../hooks/use-product-detail";
import { ProductDetailTabs } from "./product-detail-tabs";
import { formatCurrency, resolveImageUrl } from "@/lib/utils";
import { format, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";

interface ProductDetailPageProps {
  readonly productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const t = useTranslations("productAnalysisReport");
  const router = useRouter();

  const defaultStart = useMemo(() => {
    return format(subYears(new Date(), 1), "yyyy-MM-dd");
  }, []);
  const defaultEnd = useMemo(() => {
    return format(new Date(), "yyyy-MM-dd");
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const dateRange: DateRange | undefined = useMemo(() => {
    if (!startDate) return undefined;
    const from = new Date(startDate + "T00:00:00");
    const to = endDate ? new Date(endDate + "T00:00:00") : undefined;
    return { from, to };
  }, [startDate, endDate]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
      setEndDate(range.to ? format(range.to, "yyyy-MM-dd") : defaultEnd);
    } else {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  };

  const detailParams = useMemo(
    () => ({ start_date: startDate, end_date: endDate }),
    [startDate, endDate]
  );

  const { detail, isLoading: detailLoading } = useProductDetail(
    productId,
    detailParams
  );

  if (detailLoading) {
    return (
      <PageMotion className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </PageMotion>
    );
  }

  if (!detail) {
    return (
      <PageMotion className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("detail.back")}
        </Button>
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">{t("detail.notFound")}</p>
        </div>
      </PageMotion>
    );
  }

  const statistics = detail.statistics;
  const comparison = statistics?.period_comparison;

  const renderChangeIndicator = (change?: number) => {
    if (change === undefined || change === null) return null;
    const isPositive = change >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    return (
      <span
        className={`flex items-center gap-1 text-xs ${
          isPositive ? "text-success" : "text-destructive"
        }`}
      >
        <Icon className="h-3 w-3" />
        {isPositive ? "+" : ""}
        {change.toFixed(1)}%
      </span>
    );
  };

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-lg border overflow-hidden shrink-0 bg-muted">
            {detail.product_image ? (
              <img
                src={resolveImageUrl(detail.product_image)}
                alt={detail.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <ImageOff className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer mt-0.5 shrink-0"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {detail.product_name}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{detail.product_code}</Badge>
              {detail.category_name && (
                <Badge variant="outline">{detail.category_name}</Badge>
              )}
              {detail.brand_name && (
                <Badge variant="outline">{detail.brand_name}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <DateRangePicker
            dateRange={dateRange}
            onDateChange={handleDateRangeChange}
          />
        </div>
      </div>

      {/* Key Metrics (Statistics Cards) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t("detail.totalRevenue")}
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-medium">{statistics?.total_revenue_formatted ?? "-"}</div>
          {comparison?.revenue_change !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              {renderChangeIndicator(comparison.revenue_change)}
            </div>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t("detail.totalQty")}
            </div>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-medium">
            {statistics?.total_qty?.toLocaleString("id-ID") ?? "-"}
          </div>
          {comparison?.qty_change !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              {renderChangeIndicator(comparison.qty_change)}
            </div>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t("detail.totalOrders")}
            </div>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-medium">
            {statistics?.total_orders?.toLocaleString("id-ID") ?? "-"}
          </div>
          {comparison?.orders_change !== undefined && (
            <div className="text-xs text-muted-foreground mt-1">
              {renderChangeIndicator(comparison.orders_change)}
            </div>
          )}
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between pb-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t("detail.avgPrice")}
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-medium">{statistics?.avg_price_formatted ?? "-"}</div>
        </div>
      </div>

      {/* 2/3 + 1/3 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3: Tabs (Customers, Sales Reps, Trend) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-medium">{t("detail.tabsTitle")}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("detail.tabsDescription")}
            </p>
          </div>
          <ProductDetailTabs
            productId={productId}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Right Column - 1/3: Product Info Sidebar */}
        <div className="space-y-6">
          <div className="rounded-lg border">
            <div className="px-3 py-3 border-b">
              <h2 className="text-base font-medium">{t("detail.productInfo")}</h2>
            </div>
            <div className="p-3 space-y-4">
              {/* Product Image */}
              <div className="w-full aspect-square rounded-lg border overflow-hidden bg-muted">
                {detail.product_image ? (
                  <img
                    src={resolveImageUrl(detail.product_image)}
                    alt={detail.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/30">
                    <ImageOff className="h-10 w-10 mb-2" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("detail.productName")}
                  </p>
                  <p className="text-sm font-medium">{detail.product_name}</p>
                </div>
              </div>

              {detail.product_sku && (
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">SKU</p>
                    <p className="text-sm font-medium">{detail.product_sku}</p>
                  </div>
                </div>
              )}

              {detail.category_name && (
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.category")}
                    </p>
                    <p className="text-sm font-medium">
                      {detail.category_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Stock Summary Card */}
          <div className="rounded-lg border">
            <div className="px-3 py-3 border-b">
              <h2 className="text-base font-medium">{t("detail.pricingStock")}</h2>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.sellingPrice")}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(detail.selling_price)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.costPrice")}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(detail.cost_price)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.currentStock")}
                </span>
                <span className="text-sm font-medium">
                  {detail.current_stock?.toLocaleString("id-ID") ?? "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageMotion>
  );
}
