"use client";

import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Filter,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  User,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScheduleDetailDialog } from "./schedule-detail-dialog";
import { useScheduleList } from "../hooks/use-schedule-list";
import { useSchedules } from "../hooks/use-schedules";
import { formatDate } from "@/lib/utils";
import type { Schedule } from "../types";

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  pending: "bg-muted-foreground",
  confirmed: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-destructive",
};

export function ScheduleList() {
  const { state, actions, permissions, translations } = useScheduleList();
  const { t, tCommon } = translations;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [detailItem, setDetailItem] = useState<Schedule | null>(null);

  // Fetch all schedules for the visible month (no search/pagination — calendar needs all)
  const { data: allSchedulesRes, isLoading: isCalendarLoading } = useSchedules({
    page: 1,
    per_page: 100,
    status: state.statusFilter || undefined,
  });

  const allItems = allSchedulesRes?.data ?? [];

  // Build a set of dates that have schedules for calendar highlighting
  const scheduleDatesMap = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const item of allItems) {
      const dateKey = new Date(item.scheduled_at).toDateString();
      const existing = map.get(dateKey) ?? [];
      existing.push(item);
      map.set(dateKey, existing);
    }
    return map;
  }, [allItems]);

  // Filter schedules for selected date
  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    return scheduleDatesMap.get(selectedDate.toDateString()) ?? [];
  }, [selectedDate, scheduleDatesMap]);

  // Dates that have at least one schedule — for calendar modifiers
  const datesWithSchedules = useMemo(
    () => Array.from(scheduleDatesMap.keys()).map((d) => new Date(d)),
    [scheduleDatesMap],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={state.statusFilter || "all"}
            onValueChange={(value) => {
              actions.setStatusFilter(value === "all" ? "" : value);
            }}
          >
            <SelectTrigger className="w-40 cursor-pointer">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">{t("allStatuses")}</SelectItem>
              {(["pending", "confirmed", "completed", "cancelled"] as const).map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer">
                  {t(`statuses.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Auto-sync notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("autoCreatedFromTask")}</AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* Calendar sidebar */}
        <div className="rounded-lg border p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date: Date | undefined) => setSelectedDate(date ?? new Date())}
            month={calendarMonth}
            onMonthChange={(m) => setCalendarMonth(m ?? new Date())}
            modifiers={{ hasSchedule: datesWithSchedules }}
            modifiersClassNames={{
              hasSchedule:
                "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            }}
          />
          {/* Legend */}
          <div className="mt-4 space-y-1.5 border-t pt-3">
            {(["pending", "confirmed", "completed", "cancelled"] as const).map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT_COLOR[s]}`} />
                {t(`statuses.${s}`)}
              </div>
            ))}
          </div>
        </div>

        {/* Schedule list for selected date */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            {selectedDate
              ? selectedDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : t("title")}
          </div>

          {isCalendarLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : selectedDateSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("manageViaTask")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateSchedules.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setDetailItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailItem(item);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <Badge variant={STATUS_VARIANT_MAP[item.status] ?? "outline"} className="text-xs">
                          {t(`statuses.${item.status}` as Parameters<typeof t>[0])}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.scheduled_at)}
                          {item.end_at && ` - ${formatDate(item.end_at)}`}
                        </span>
                        {item.employee && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.employee.name}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[180px]">{item.location}</span>
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {(permissions.canUpdate || permissions.canDelete) && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailItem(item)} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />
                              {t("detailTitle")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <ScheduleDetailDialog
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        schedule={detailItem}
      />
    </div>
  );
}
