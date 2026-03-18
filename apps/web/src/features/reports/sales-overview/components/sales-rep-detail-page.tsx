"use client";

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
  User,
  Mail,
  Briefcase,
  Building2,
} from "lucide-react";
import { useSalesRepDetail } from "../hooks/use-sales-rep-detail";
import { useSalesRepCheckInLocations } from "../hooks/use-sales-rep-check-in-locations";
import { SalesRepStatistics } from "./sales-rep-statistics";
import { SalesRepDetailTabs } from "./sales-rep-detail-tabs";
import { format, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";

interface SalesRepDetailPageProps {
  readonly employeeId: string;
}

export function SalesRepDetailPage({
  employeeId,
}: SalesRepDetailPageProps) {
  const t = useTranslations("salesOverviewReport");
  const router = useRouter();

  // Default date range: last year
  const defaultStart = useMemo(() => {
    return format(subYears(new Date(), 1), "yyyy-MM-dd");
  }, []);
  const defaultEnd = useMemo(() => {
    return format(new Date(), "yyyy-MM-dd");
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Convert to DateRange for picker
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!startDate) return undefined;
    const from = new Date(startDate + "T00:00:00");
    const to = endDate
      ? new Date(endDate + "T00:00:00")
      : undefined;
    return { from, to };
  }, [startDate, endDate]);

  const handleDateRangeChange = (
    range: DateRange | undefined
  ) => {
    if (range?.from) {
      setStartDate(format(range.from, "yyyy-MM-dd"));
      setEndDate(
        range.to
          ? format(range.to, "yyyy-MM-dd")
          : defaultEnd
      );
    } else {
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
    }
  };

  const detailParams = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
    }),
    [startDate, endDate]
  );

  const { detail, isLoading: detailLoading } =
    useSalesRepDetail(employeeId, detailParams);

  const {
    locations,
    isLoading: locationsLoading,
    totalVisits,
    page: locationsPage,
    setPage: setLocationsPage,
    perPage: locationsPerPage,
    setPerPage: setLocationsPerPage,
  } = useSalesRepCheckInLocations(employeeId, detailParams);

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
          <p className="text-muted-foreground">
            {t("detail.notFound")}
          </p>
        </div>
      </PageMotion>
    );
  }

  const statistics = detail.statistics;

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer mt-0.5 shrink-0"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {detail.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {detail.employee_code}
              </Badge>
              {detail.position_name && (
                <Badge variant="outline">
                  {detail.position_name}
                </Badge>
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
      <SalesRepStatistics statistics={statistics} />

      {/* 2/3 + 1/3 Grid Layout - mirroring pipeline detail style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3: Tabs (Locations, Products, Customers) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium">{t("detail.tabsTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {t("detail.tabsDescription")}
              </p>
            </div>
            <SalesRepDetailTabs
              employeeId={employeeId}
              startDate={startDate}
              endDate={endDate}
              checkInLocationsProps={{
                locations,
                isLoading: locationsLoading,
                totalVisits,
                page: locationsPage,
                perPage: locationsPerPage,
                onPageChange: setLocationsPage,
                onPerPageChange: setLocationsPerPage,
              }}
            />
          </div>
        </div>

        {/* Right Column - 1/3: Employee Info Sidebar */}
        <div className="space-y-6">
          {/* Employee Information Card */}
          <div className="rounded-lg border">
            <div className="px-3 py-3 border-b">
              <h2 className="text-base font-medium">{t("detail.employeeInfo")}</h2>
            </div>
            <div className="p-3 space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("detail.name")}
                  </p>
                  <p className="text-sm font-medium">
                    {detail.name}
                  </p>
                </div>
              </div>

              {detail.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.email")}
                    </p>
                    <p className="text-sm font-medium">
                      {detail.email}
                    </p>
                  </div>
                </div>
              )}

              {detail.position_name && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.position")}
                    </p>
                    <p className="text-sm font-medium">
                      {detail.position_name}
                    </p>
                  </div>
                </div>
              )}

              {detail.division_name && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("detail.division")}
                    </p>
                    <p className="text-sm font-medium">
                      {detail.division_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Summary Card */}
          <div className="rounded-lg border">
            <div className="px-3 py-3 border-b">
              <h2 className="text-base font-medium">{t("detail.performanceSummary")}</h2>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.avgOrderValue")}
                </span>
                <span className="text-sm font-medium">
                  {(statistics?.total_orders ?? 0) > 0
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(
                        (statistics?.total_revenue ?? 0) /
                          (statistics?.total_orders ?? 1)
                      )
                    : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.visitsPerOrder")}
                </span>
                <span className="text-sm font-medium">
                  {(statistics?.total_orders ?? 0) > 0
                    ? (
                        (statistics?.visits_completed ?? 0) /
                        (statistics?.total_orders ?? 1)
                      ).toFixed(1)
                    : "-"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t("detail.conversionRate")}
                </span>
                <span className="text-sm font-medium">
                  {statistics?.conversion_rate != null
                    ? `${statistics.conversion_rate.toFixed(1)}%`
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageMotion>
  );
}
