"use client";

import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, parseISO, startOfMonth, startOfToday } from "date-fns";
import { CalendarOff, ChevronLeft, ChevronRight, Clock4, TreePalm } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAttendanceHistory } from "../hooks/use-attendance-records";
import { useHolidaysByYear } from "../../holidays/hooks/use-holidays";
import type { AttendanceRecord } from "../types";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PRESENT":
      return "default";
    case "LATE":
      return "secondary";
    case "ABSENT":
      return "destructive";
    default:
      return "outline";
  }
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  const part = value.split(" ")[1] ?? value;
  return part.substring(0, 8);
}

function getCheckInTypeLabel(t: ReturnType<typeof useTranslations>, type?: string): string {
  if (!type) return t("checkInType.NORMAL");
  return t(`checkInType.${type}`);
}

export function AttendanceCalendarTab() {
  const t = useTranslations("hrd.attendance");
  const tHoliday = useTranslations("hrd.holiday");
  const locale = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());

  const monthFrom = format(startOfMonth(month), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(month), "yyyy-MM-dd");

  const { data, isLoading, isError } = useMyAttendanceHistory({
    date_from: monthFrom,
    date_to: monthTo,
    per_page: 20,
    page: 1,
  });

  // Fetch holidays for the current calendar year
  const currentYear = month.getFullYear();
  const { data: holidaysData } = useHolidaysByYear(currentYear);

  // Build a Map<dateKey, { name, type }> for quick holiday lookup
  const holidayMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    if (holidaysData?.data) {
      for (const holiday of holidaysData.data) {
        map.set(holiday.date, { name: holiday.name, type: holiday.type });
      }
    }
    return map;
  }, [holidaysData]);

  // Holiday dates for current month (for calendar modifiers)
  const holidayDates = useMemo(() => {
    return Array.from(holidayMap.entries())
      .filter(([dateStr]) => dateStr >= monthFrom && dateStr <= monthTo)
      .map(([dateStr]) => parseISO(dateStr));
  }, [holidayMap, monthFrom, monthTo]);

  const records = useMemo(() => data?.data ?? [], [data?.data]);
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const dayRecords = useMemo(
    () => records.filter((r) => (r.date ?? "").startsWith(selectedKey)),
    [records, selectedKey]
  );
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((record) => {
      const key = (record.date ?? "").slice(0, 10);
      if (key && !map.has(key)) {
        map.set(key, record);
      }
    });
    return map;
  }, [records]);

  const selectedRecord: AttendanceRecord | undefined = dayRecords[0];
  const selectedHoliday = holidayMap.get(selectedKey);

  const currentMonthStats = useMemo(() => {
    const stats = records.reduce(
      (acc, record) => {
        if (record.status === "PRESENT" || record.status === "WFH") {
          acc.present += 1;
        } else if (record.status === "ABSENT") {
          acc.absent += 1;
        } else if (record.status === "LATE") {
          acc.late += 1;
        } else if (record.status === "HALF_DAY") {
          acc.halfDay += 1;
        } else if (record.status === "LEAVE") {
          acc.leave += 1;
        }
        return acc;
      },
      { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0 }
    );

    // Count holidays for the current month from the holiday map
    const holidayCount = Array.from(holidayMap.entries()).filter(
      ([dateStr]) => dateStr >= monthFrom && dateStr <= monthTo
    ).length;

    return { ...stats, holiday: holidayCount };
  }, [records, holidayMap, monthFrom, monthTo]);

  return (
    <div className="space-y-4 p-1">
      <div className="rounded-xl border border-border/80 bg-card p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="text-lg font-semibold">{format(month, "MMMM yyyy")}</h4>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setMonth(addMonths(month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer px-3"
              onClick={() => {
                const today = startOfToday();
                setMonth(today);
                setSelectedDate(today);
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="cursor-pointer"
              onClick={() => setMonth(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d: Date | undefined) => d && setSelectedDate(d)}
          month={month}
          onMonthChange={(m) => m && setMonth(m)}
          className="w-full"
          classNames={{
            months: "w-full",
            month: "w-full",
            month_caption: "hidden",
            month_grid: "w-full table-fixed border-collapse",
            weeks: "w-full",
            week: "w-full",
            weekday: "w-full p-0 h-10 text-sm font-semibold text-muted-foreground text-center",
            day: "h-12 w-full p-0",
            day_button:
              "relative w-full h-10 px-1 items-center justify-center rounded-lg text-sm transition-colors data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground hover:bg-accent",
            today:
              "[&>button]:border [&>button]:border-primary/60 [&>button]:bg-primary/10 [&>button]:text-primary [&>button]:data-[selected=true]:border-primary [&>button]:data-[selected=true]:bg-primary [&>button]:data-[selected=true]:text-primary-foreground",
          }}
          modifiers={{
            present: Array.from(recordsByDate.values())
              .filter((r) => r.status === "PRESENT" || r.status === "WFH")
              .map((r) => parseISO(r.date)),
            absent: Array.from(recordsByDate.values())
              .filter((r) => r.status === "ABSENT")
              .map((r) => parseISO(r.date)),
            late: Array.from(recordsByDate.values())
              .filter((r) => r.status === "LATE")
              .map((r) => parseISO(r.date)),
            halfDay: Array.from(recordsByDate.values())
              .filter((r) => r.status === "HALF_DAY")
              .map((r) => parseISO(r.date)),
            holiday: holidayDates,
            leave: Array.from(recordsByDate.values())
              .filter((r) => r.status === "LEAVE")
              .map((r) => parseISO(r.date)),
          }}
          modifiersClassNames={{
            present:
              "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-success [&>button]:after:content-['']",
            absent:
              "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-destructive [&>button]:after:content-['']",
            late:
              "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-warning [&>button]:after:content-['']",
            halfDay:
              "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-warning [&>button]:after:content-['']",
            holiday:
              "[&>button]:bg-rose [&>button]:text-accent dark:[&>button]:text-accent [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-rose [&>button]:after:content-['']",
            leave:
              "[&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:h-1.5 [&>button]:after:w-1.5 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-primary [&>button]:after:content-['']",
          }}
        />
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-base font-semibold">{t("detail.title")}</h4>
          {selectedRecord ? (
            <Badge variant={getStatusVariant(selectedRecord.status)}>
              {t(`status.${selectedRecord.status}`)}
            </Badge>
          ) : selectedHoliday ? (
            <Badge variant="outline" className="border-rose bg-rose-50 text-accent dark:border-rose dark:bg-rose dark:text-accent">
              {t("status.HOLIDAY")}
            </Badge>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">{t("errors.fetchFailed")}</p>
        ) : selectedRecord ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-muted-foreground">{t("fields.date")}</span>
              <span className="text-right font-medium">
                {new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(selectedDate)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-2">
              <span className="text-muted-foreground">{t("fields.checkInTime")}</span>
              <div className="flex items-center justify-end gap-2">
                <Clock4 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatTime(selectedRecord.check_in_time)}</span>
              </div>
              <span className="text-muted-foreground">{t("fields.checkInType")}</span>
              <div className="flex justify-end">
                <Badge variant="outline">
                  {getCheckInTypeLabel(t, selectedRecord.check_in_type)}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-2">
              <span className="text-muted-foreground">{t("fields.checkOutTime")}</span>
              <div className="flex items-center justify-end gap-2">
                <Clock4 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatTime(selectedRecord.check_out_time)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 pt-2">
              <span className="text-muted-foreground">{t("fields.notes")}</span>
              <span className="text-right font-medium">
                {selectedRecord.notes?.trim() ? selectedRecord.notes : "-"}
              </span>
            </div>
          </div>
        ) : selectedHoliday ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-muted-foreground">{t("fields.date")}</span>
              <span className="text-right font-medium">
                {new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(selectedDate)}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-rose bg-rose-50/50 p-3 dark:border-rose dark:bg-rose">
              <CalendarOff className="h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-accent dark:text-accent">
                  {selectedHoliday.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tHoliday(`types.${selectedHoliday.type}`)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <TreePalm className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4">
        <h4 className="mb-3 text-sm font-semibold">Legend</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span>{t("status.PRESENT")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.present}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span>{t("status.LATE")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.late}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
            <span>{t("status.ABSENT")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.absent}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" />
            <span>{t("status.HALF_DAY")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.halfDay}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose" />
            <span>{t("status.HOLIDAY")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.holiday}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span>{t("status.LEAVE")}</span>
            <span className="ml-auto text-muted-foreground">{currentMonthStats.leave}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
