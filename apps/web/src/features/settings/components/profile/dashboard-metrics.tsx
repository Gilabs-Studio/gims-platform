"use client";

import { useState } from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useSalesRepCheckInLocations } from "@/features/reports/sales-overview/hooks/use-sales-rep-check-in-locations";

const SalesRepDetailTabs = dynamic(
  () =>
    import("@/features/reports/sales-overview/components/sales-rep-detail-tabs").then((mod) => ({
      default: mod.SalesRepDetailTabs,
    })),
  {
    loading: () => <Skeleton className="h-[500px] w-full" />,
    ssr: false,
  }
);

export function DashboardMetrics() {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const employeeId = user?.employee_id ?? "";
  const {
    locations,
    isLoading,
    error,
    totalVisits,
    page,
    setPage,
    perPage,
    setPerPage,
  } = useSalesRepCheckInLocations(employeeId, {
    start_date: startDate,
    end_date: endDate,
    page: 1,
    per_page: 50,
  });

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

  if (!employeeId) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("metrics.metricsLoadError")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{t("metrics.description")}</h3>
          <p className="text-sm text-muted-foreground">{t("metrics.subtitle")}</p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <SalesRepDetailTabs
          employeeId={employeeId}
          startDate={startDate}
          endDate={endDate}
          checkInLocationsProps={{
            locations,
            isLoading,
            totalVisits,
            page,
            perPage,
            onPageChange: setPage,
            onPerPageChange: setPerPage,
          }}
        />
      </Suspense>
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
