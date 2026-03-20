"use client";

import { useMemo } from "react";
import { format, isSameDay, isSameMonth, startOfWeek, addDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "../types";

interface AttendanceCalendarProps {
  readonly currentDate: Date;
  readonly events: readonly CalendarEvent[];
  readonly holidays?: ReadonlyMap<string, { name: string; type: string }>;
  readonly onPreviousMonth: () => void;
  readonly onNextMonth: () => void;
  readonly onToday: () => void;
  readonly onDateClick: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDayBreakdown(dayEvents: readonly CalendarEvent[]) {
  return dayEvents.reduce(
    (acc, event) => {
      if (event.status === "PRESENT" || event.status === "WFH") {
        acc.present += 1;
      } else if (event.status === "LATE") {
        acc.late += 1;
      } else if (event.status === "ABSENT") {
        acc.absent += 1;
      } else if (event.status === "LEAVE") {
        acc.leave += 1;
      }
      return acc;
    },
    { present: 0, late: 0, absent: 0, leave: 0 }
  );
}

export function AttendanceCalendar({
  currentDate,
  events,
  holidays,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onDateClick,
}: AttendanceCalendarProps) {
  const t = useTranslations("hrd.attendance");

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), {
      weekStartsOn: 0,
    });
    const days: Date[] = [];

    for (let i = 0; i < 42; i++) {
      days.push(addDays(start, i));
    }

    return days;
  }, [currentDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    events.forEach((event) => {
      const dateKey = format(event.date, "yyyy-MM-dd");
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, event]);
    });

    return grouped;
  }, [events]);

  return (
    <div className="flex h-full flex-col border border-border rounded-xl bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 cursor-pointer"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousMonth}
            className="h-8 w-8 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-r border-border px-3 py-3 text-center text-xs font-medium text-muted-foreground last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid min-h-[640px] grid-cols-7">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const hasEvents = dayEvents.length > 0;
              const holiday = holidays?.get(dateKey);
              const dayBreakdown = getDayBreakdown(dayEvents);
              const dayLabel = holiday
                ? t("status.HOLIDAY")
                : hasEvents
                  ? t("calendar.workDay")
                  : t("calendar.nonWorkDay");

              return (
                <button
                  key={`${dateKey}-${index}`}
                  onClick={() => onDateClick(day)}
                  className={cn(
                    "min-h-[132px] flex flex-col border-b border-r border-border px-3 py-3 text-left transition-colors hover:bg-muted/20 cursor-pointer last:border-r-0",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isToday && "bg-muted/20"
                  )}
                >
                  <div className="flex w-full items-start justify-between">
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold",
                        isToday && "bg-primary text-primary-foreground font-semibold",
                        !isToday && isCurrentMonth && "text-foreground",
                        !isToday && !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {hasEvents && isCurrentMonth ? (
                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        {dayBreakdown.present > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {dayBreakdown.present}
                          </span>
                        )}

                        {dayBreakdown.late > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-warning">
                            <Clock3 className="h-3.5 w-3.5" />
                            {dayBreakdown.late}
                          </span>
                        )}

                        {dayBreakdown.absent > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-destructive">
                            <XCircle className="h-3.5 w-3.5" />
                            {dayBreakdown.absent}
                          </span>
                        )}

                        {dayBreakdown.leave > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-blue-500">
                            <FileText className="h-3.5 w-3.5" />
                            {dayBreakdown.leave}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {isCurrentMonth && (
                    <div className="mt-auto pt-4 space-y-1">
                      <div className="flex items-center text-[11px] font-medium tracking-wide">
                        <span
                          className={cn(
                            holiday
                              ? "text-destructive font-medium"
                              : hasEvents
                                ? "text-success font-medium"
                                : "text-muted-foreground/60"
                          )}
                        >
                          {dayLabel}
                        </span>
                      </div>

                      {holiday ? (
                        <p className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                          {holiday.name}
                        </p>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
