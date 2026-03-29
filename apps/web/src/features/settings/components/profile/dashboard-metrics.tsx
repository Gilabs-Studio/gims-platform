"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeMetrics } from "../../hooks/use-employee-metrics";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";

export function DashboardMetrics() {
  const t = useTranslations("profile");
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data, isLoading, error } = useEmployeeMetrics({ startDate, endDate });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={true} />
        </div>
        <MetricsLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
        </div>
        <div className="text-center py-8 text-destructive">
          <p>{t("metrics.metricsLoadError")}</p>
        </div>
      </div>
    );
  }

  const metrics = data?.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{t("metrics.description")}</h3>
          <p className="text-sm text-muted-foreground">{t("metrics.subtitle")}</p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      {(!metrics?.check_in_locations && !metrics?.products_sold && !metrics?.customers) ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("metrics.metricsLoadError")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Check-in Locations */}
          {metrics?.check_in_locations && (
            <Card className="h-full border-border/70 shadow-none">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-medium">{t("metrics.checkInLocations")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalLocations")}</p>
                  <p className="text-2xl font-bold">{metrics.check_in_locations.total_locations}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalVisits")}</p>
                  <p className="text-lg font-semibold">{metrics.check_in_locations.total_visits}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Sold */}
          {metrics?.products_sold && (
            <Card className="h-full border-border/70 shadow-none">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-medium">{t("metrics.productsSold")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalProducts")}</p>
                  <p className="text-2xl font-bold">{metrics.products_sold.total_products}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalRevenue")}</p>
                  <p className="text-lg font-semibold text-primary">{metrics.products_sold.total_revenue_formatted}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customers */}
          {metrics?.customers && (
            <Card className="h-full border-border/70 shadow-none">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-medium">{t("metrics.customers")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalCustomers")}</p>
                  <p className="text-2xl font-bold">{metrics.customers.total_customers}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("metrics.totalOrders")}</p>
                  <p className="text-lg font-semibold">{metrics.customers.total_orders}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function MetricsLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
