"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHolidaysByYear } from "../hooks/use-holidays";
import type { Holiday, HolidayType } from "../types";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  getDay,
} from "date-fns";

interface HolidayCalendarViewProps {
  year: number;
  onYearChange: (year: number) => void;
}

export function HolidayCalendarView({
  year,
  onYearChange,
}: HolidayCalendarViewProps) {
  const t = useTranslations("hrd.holiday");

  const { data, isLoading } = useHolidaysByYear(year);
  const holidays = data?.data ?? [];

  // Create a map of date -> holiday for quick lookup
  const holidayMap = new Map<string, Holiday>();
  holidays.forEach((h) => {
    holidayMap.set(h.date.split("T")[0], h);
  });

  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const handlePrevYear = () => {
    onYearChange(year - 1);
  };

  const handleNextYear = () => {
    onYearChange(year + 1);
  };

  const getTypeBadgeVariant = (type: HolidayType) => {
    switch (type) {
      case "NATIONAL":
        return "default";
      case "COLLECTIVE":
        return "secondary";
      case "COMPANY":
        return "outline";
      default:
        return "outline";
    }
  };

  const renderMonth = (monthDate: Date) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });

    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = getDay(start);
    // Adjust for Monday start (0 = Monday)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    return (
      <Card key={monthDate.getTime()} className="overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/50">
          <CardTitle className="text-sm font-medium">
            {format(monthDate, "MMMM")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayLabels.map((label, i) => (
              <div
                key={i}
                className={cn(
                  "text-center text-xs text-muted-foreground font-medium",
                  i >= 5 && "text-destructive/70"
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: adjustedStartDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const holiday = holidayMap.get(dateStr);
              const isWeekendDay = isWeekend(day);

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "aspect-square flex items-center justify-center text-xs rounded-md relative group",
                    isWeekendDay && "text-destructive/70",
                    holiday &&
                      "bg-primary text-primary-foreground font-medium cursor-pointer"
                  )}
                  title={holiday?.name}
                >
                  {format(day, "d")}
                  {holiday && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                      <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border">
                        {holiday.name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="py-3 px-4">
                <Skeleton className="h-5 w-20" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, j) => (
                    <Skeleton key={j} className="aspect-square" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{t("calendar")}</h3>
          <p className="text-sm text-muted-foreground">
            {holidays.length} holidays in {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevYear}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 py-1 font-medium min-w-20 text-center">
            {year}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextYear}
            className="cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-destructive/50" />
          <span className="text-destructive/70">Weekend</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            {t("types.NATIONAL")}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {t("types.COLLECTIVE")}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {t("types.COMPANY")}
          </Badge>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => renderMonth(month))}
      </div>

      {/* Holiday List Summary */}
      {holidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Holidays in {year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...holidays]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center gap-3 p-2 rounded-lg border"
                  >
                    <div className="text-center min-w-12">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(holiday.date), "MMM")}
                      </div>
                      <div className="text-lg font-bold">
                        {format(new Date(holiday.date), "d")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{holiday.name}</div>
                      <Badge
                        variant={getTypeBadgeVariant(holiday.type)}
                        className="text-xs mt-1"
                      >
                        {t(`types.${holiday.type}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
