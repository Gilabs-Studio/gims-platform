"use client";

import { useMemo } from "react";
import { format, isSameDay, isSameMonth, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const STATUS_DOT_COLORS: Record<string, string> = {
  PRESENT: "bg-success",
  LATE: "bg-warning",
  ABSENT: "bg-destructive",
  LEAVE: "bg-primary",
  HALF_DAY: "bg-purple",
  HOLIDAY: "bg-successteal",
  WFH: "bg-cyan",
  OFF_DAY: "bg-mutedgray",
};

export function AttendanceCalendar({
  currentDate,
  events,
  holidays,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onDateClick,
}: AttendanceCalendarProps) {
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
    <div className="flex h-full flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-r border-border px-3 py-2 text-center text-xs font-normal text-muted-foreground last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid h-[calc(100%-2.5rem)] grid-cols-7 grid-rows-6">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const hasEvents = dayEvents.length > 0;
              const holiday = holidays?.get(dateKey);

              // Get unique statuses for this day to show different colored dots
              const statusCounts = dayEvents.reduce((acc, event) => {
                acc[event.status] = (acc[event.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);

              return (
                <button
                  key={`${dateKey}-${index}`}
                  onClick={() => onDateClick(day)}
                  className={cn(
                    "relative border-b border-r border-border bg-background p-3 text-left transition-colors hover:bg-muted/50 last:border-r-0 cursor-pointer",
                    !isCurrentMonth && "bg-muted/20",
                    hasEvents && "hover:bg-accent/10"
                  )}
                >
                  {/* Date Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                        isToday && "bg-primary text-primary-foreground font-semibold",
                        !isCurrentMonth && "text-muted-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {hasEvents && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Holiday Badge */}
                  {holiday && isCurrentMonth && (
                    <div className="mt-1">
                      <span className="inline-block max-w-full truncate rounded-sm bg-destructive px-1 py-0.5 text-[9px] font-semibold leading-none text-destructive dark:bg-destructive/40 dark:text-destructive">
                        {holiday.name}
                      </span>
                    </div>
                  )}

                  {/* Status Indicators - Colored Dots */}
                  {hasEvents && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(statusCounts).map(([status, count]) => (
                        <div
                          key={status}
                          className="flex items-center gap-1"
                        >
                          <div
                            className={cn(
                              "h-2 w-2 rounded-full",
                              STATUS_DOT_COLORS[status] ?? "bg-mutedgray"
                            )}
                          />
                          {count > 1 && (
                            <span className="text-[9px] text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </div>
                      ))}
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
