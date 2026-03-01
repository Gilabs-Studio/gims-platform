"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import type { VisitReport, VisitReportStatus } from "../types";

const STATUS_COLORS: Record<VisitReportStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface VisitReportCalendarViewProps {
  readonly items: VisitReport[];
}

export function VisitReportCalendarView({ items }: VisitReportCalendarViewProps) {
  const t = useTranslations("crmVisitReport");
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Group visits by date key (YYYY-MM-DD)
  const visitsByDate = useMemo(() => {
    const map = new Map<string, VisitReport[]>();
    for (const item of items) {
      if (!item.visit_date) continue;
      const dateKey = item.visit_date.split("T")[0];
      const existing = map.get(dateKey) ?? [];
      existing.push(item);
      map.set(dateKey, existing);
    }
    return map;
  }, [items]);

  // Generate calendar grid cells
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: number | null; dateKey: string }> = [];

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push({ date: null, dateKey: "" });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: d, dateKey });
    }

    return cells;
  }, [year, month]);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="cursor-pointer h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">{monthLabel}</h3>
          <Button variant="outline" size="icon" onClick={nextMonth} className="cursor-pointer h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToday} className="cursor-pointer text-xs">
          {t("calendar.today")}
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-lg border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const visits = cell.dateKey ? (visitsByDate.get(cell.dateKey) ?? []) : [];
            const isToday = cell.dateKey === todayKey;

            return (
              <div
                key={idx}
                className={`min-h-[90px] border-b border-r p-1 ${
                  cell.date == null ? "bg-muted/20" : ""
                } ${isToday ? "bg-primary/5" : ""}`}
              >
                {cell.date != null && (
                  <>
                    <span className={`text-xs font-medium inline-flex items-center justify-center h-5 w-5 rounded-full ${
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}>
                      {cell.date}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {visits.slice(0, 3).map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => router.push(`/crm/visits/${v.id}`)}
                          className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded cursor-pointer truncate ${
                            STATUS_COLORS[v.status as VisitReportStatus] ?? STATUS_COLORS.draft
                          }`}
                          title={`${v.code} - ${v.customer?.name ?? ""}`}
                        >
                          {v.customer?.name ?? v.code}
                        </button>
                      ))}
                      {visits.length > 3 && (
                        <p className="text-[10px] text-muted-foreground px-1">
                          +{visits.length - 3} {t("calendar.more")}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
          <span>{t("status.draft")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-200 dark:bg-amber-900/50" />
          <span>{t("status.submitted")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-200 dark:bg-green-900/50" />
          <span>{t("status.approved")}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-200 dark:bg-red-900/50" />
          <span>{t("status.rejected")}</span>
        </div>
      </div>
    </div>
  );
}
