"use client";

import { useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, Plus, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarDaySummary } from "../types";
import { useLocale } from "next-intl";
import { visitI18nEn } from "../i18n/en";
import { visitI18nId } from "../i18n/id";

interface VisitCalendarViewProps {
  readonly summary: CalendarDaySummary[];
  readonly currentDate: Date;
  readonly isLoading?: boolean;
  readonly onDateChange: (date: Date) => void;
  readonly onDateClick: (date: Date) => void;
}

export function VisitCalendarView({ 
  summary, 
  currentDate, 
  isLoading,
  onDateChange,
  onDateClick 
}: VisitCalendarViewProps) {
  const locale = useLocale();
  const translations = locale === "id" ? visitI18nId : visitI18nEn;

  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value: any = translations;
    for (const k of keys) {
      value = value?.[k];
    }
    if (value === undefined) return key;
    let str = String(value);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/80";
      case "in_progress": return "bg-blue-600 text-white border-blue-600 hover:bg-blue-600/90";
      case "completed": return "bg-green-600 text-white border-green-600 hover:bg-green-600/90";
      case "cancelled": return "bg-red-600 text-white border-red-600 hover:bg-red-600/90";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "planned": return <Clock className="h-3 w-3" />;
      case "in_progress": return <MapPin className="h-3 w-3" />;
      case "completed": return <CheckCircle2 className="h-3 w-3" />;
      case "cancelled": return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {format(currentDate, "MMMM yyyy")}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => onDateChange(subMonths(currentDate, 1))} className="cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onDateChange(new Date())} className="cursor-pointer">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDateChange(addMonths(currentDate, 1))} className="cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-background shadow-sm">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const dateStr = format(day, "yyyy-MM-dd");
            const daySummary = summary.find(s => s.date.startsWith(dateStr));
            const previewItems = daySummary?.preview_items ?? [];
            const count = daySummary?.total_count ?? 0;
            const remainingCount = Math.max(0, count - previewItems.length);

            return (
              <div 
                key={day.toString()}
                onClick={() => onDateClick(day)}
                className={cn(
                  "min-h-[140px] p-2 border-r border-b relative group cursor-pointer transition-colors hover:bg-muted/10 flex flex-col",
                  !isCurrentMonth && "bg-muted/5 text-muted-foreground",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className={cn(
                     "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full transition-colors z-10",
                     isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                   )}>
                     {format(day, "d")}
                   </span>
                </div>

                <div className="space-y-1.5 flex-1 z-0">
                  {previewItems.map((item) => (
                    <div key={item.id} className={cn("text-[10px] sm:text-xs p-1.5 rounded-sm border truncate flex items-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]", getStatusColor(item.status))}>
                      <span className="shrink-0 opacity-70">{getStatusIcon(item.status)}</span>
                      <span className="font-semibold tabular-nums shrink-0">{item.scheduled_time}</span>
                      <span className="truncate">{item.customer_name || t("unknownCompany")}</span>
                    </div>
                  ))}
                  {remainingCount > 0 && (
                    <div className="text-[10px] text-muted-foreground font-medium pl-1 mt-1">
                      {t("moreVisits", { count: remainingCount })}
                    </div>
                  )}
                </div>

                {/* Absolutely Centered Add Button (Only if empty) */}
                {count === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="bg-primary/90 text-primary-foreground rounded-full p-2.5 shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-200">
                      <Plus className="h-6 w-6 stroke-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
