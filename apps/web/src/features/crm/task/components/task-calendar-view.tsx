"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { ScheduleDetailDialog } from "@/features/crm/schedule/components/schedule-detail-dialog";
import { TaskDetailDialog } from "@/features/crm/task/components/task-detail-dialog";
import { useSchedules } from "@/features/crm/schedule/hooks/use-schedules";
import { useTasks } from "@/features/crm/task/hooks/use-tasks";
import { useUserPermission } from "@/hooks/use-user-permission";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { Schedule } from "@/features/crm/schedule/types";
import type { Task } from "@/features/crm/task/types";

const STATUS_VARIANT_MAP: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  confirmed: "default",
  completed: "default",
  cancelled: "destructive",
};

const STATUS_DOT_COLOR: Record<string, string> = {
  pending: "bg-muted-foreground",
  confirmed: "bg-primary",
  completed: "bg-green-500",
  cancelled: "bg-destructive",
};

export function TaskCalendarView() {
  const t = useTranslations("crmSchedule");
  const tTask = useTranslations("crmTask");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [detailItem, setDetailItem] = useState<Schedule | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const canViewLead = useUserPermission("crm_lead.read");
  const canViewDeal = useUserPermission("crm_deal.read");
  const canViewCustomer = useUserPermission("customer.read");

  const { data: allSchedulesRes, isLoading } = useSchedules({
    page: 1,
    per_page: 100,
    status: statusFilter || undefined,
  });

  const { data: overdueTasksRes } = useTasks({
    is_overdue: true,
    per_page: 50,
  });

  const allItems = useMemo(() => allSchedulesRes?.data ?? [], [allSchedulesRes]);
  const overdueItems = useMemo<Task[]>(() => overdueTasksRes?.data ?? [], [overdueTasksRes]);

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

  const selectedDateSchedules = useMemo(() => {
    if (!selectedDate) return [];
    return scheduleDatesMap.get(selectedDate.toDateString()) ?? [];
  }, [selectedDate, scheduleDatesMap]);

  const datesWithSchedules = useMemo(() => {
    const scheduleDates = Array.from(scheduleDatesMap.keys()).map((d) => new Date(d));
    const overdueTaskDates = overdueItems
      .filter((t) => t.due_date)
      .map((t) => {
        const [y, mo, d] = t.due_date!.split("-").map(Number);
        return new Date(y!, mo! - 1, d!);
      });
    return [...scheduleDates, ...overdueTaskDates];
  }, [scheduleDatesMap, overdueItems]);

  // Overdue tasks whose due_date matches the currently selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const selStr = [
      selectedDate.getFullYear(),
      String(selectedDate.getMonth() + 1).padStart(2, "0"),
      String(selectedDate.getDate()).padStart(2, "0"),
    ].join("-");
    return overdueItems.filter((t) => t.due_date === selStr);
  }, [selectedDate, overdueItems]);

  return (
    <div className="space-y-4">
      {/* Filter + Info */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
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

      <div className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>{t("autoCreatedFromTask")}</span>
      </div>

      {/* Calendar + Schedule List grid */}
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

        {/* Right panel: overdue + date-based schedules */}
        <div className="space-y-6">

          {/* Overdue Tasks Section */}
          {overdueItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {tTask("overdue")}
                <span className="text-xs font-normal text-muted-foreground">({overdueItems.length})</span>
              </div>
              <div className="space-y-2">
                {overdueItems.map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => {
                      if (task.due_date) {
                        const [y, mo, d] = task.due_date.split("-").map(Number);
                        const date = new Date(y!, mo! - 1, d!);
                        setSelectedDate(date);
                        setCalendarMonth(date);
                      }
                      setSelectedTask(task);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (task.due_date) {
                          const [y, mo, d] = task.due_date.split("-").map(Number);
                          const date = new Date(y!, mo! - 1, d!);
                          setSelectedDate(date);
                          setCalendarMonth(date);
                        }
                        setSelectedTask(task);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-medium text-sm line-clamp-1 flex-1">{task.title}</span>
                      <Badge variant="destructive" className="text-xs shrink-0">
                        {tTask(`priorities.${task.priority}` as Parameters<typeof tTask>[0])}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {task.assigned_to_employee && (
                        <span className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarFallback dataSeed={task.assigned_to_employee.name} />
                          </Avatar>
                          {task.assigned_to_employee.name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-destructive font-medium">
                          <Clock className="h-3 w-3" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>

                    {(task.lead ?? task.deal ?? task.customer) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {task.lead && (
                          canViewLead ? (
                            <Link
                              href={`/crm/leads/${task.lead.id}`}
                              className="text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {task.lead.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{task.lead.name}</span>
                          )
                        )}
                        {task.deal && (
                          canViewDeal ? (
                            <Link
                              href={`/crm/pipeline/${task.deal.id}`}
                              className="text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {task.deal.title}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{task.deal.title}</span>
                          )
                        )}
                        {task.customer && (
                          canViewCustomer ? (
                            <Link
                              href={`/master-data/customers/${task.customer.id}`}
                              className="text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {task.customer.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{task.customer.name}</span>
                          )
                        )}
                      </div>
                    )}
                    {/* Reminder mini-cards */}
                    {task.reminders?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {task.reminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-start gap-2 rounded border border-dashed px-2 py-1.5 bg-background/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Bell className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{reminder.message}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDate(reminder.remind_at)} &middot; {tTask(`reminder.types.${reminder.reminder_type}` as Parameters<typeof tTask>[0])}
                                {reminder.is_sent && <span className="ml-1 text-green-600">✔ {tTask("reminder.sent")}</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : selectedDateSchedules.length === 0 && selectedDateTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Overdue tasks that fall on the selected date */}
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 cursor-pointer hover:bg-destructive/10 transition-colors"
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedTask(task);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-medium text-sm flex-1 line-clamp-1">{task.title}</span>
                      <Badge variant="destructive" className="text-xs shrink-0">
                        {tTask(`priorities.${task.priority}` as Parameters<typeof tTask>[0])}
                      </Badge>
                    </div>
                    {task.assigned_to_employee && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback dataSeed={task.assigned_to_employee.name} />
                        </Avatar>
                        {task.assigned_to_employee.name}
                      </span>
                    )}
                    {/* Reminder mini-cards */}
                    {task.reminders?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {task.reminders.map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-start gap-2 rounded border border-dashed px-2 py-1.5 bg-background/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Bell className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{reminder.message}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDate(reminder.remind_at)} &middot; {tTask(`reminder.types.${reminder.reminder_type}` as Parameters<typeof tTask>[0])}
                                {reminder.is_sent && <span className="ml-1 text-green-600">✔ {tTask("reminder.sent")}</span>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Regular schedules for the selected date */}
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm flex-1 line-clamp-1">{item.title}</h4>
                        <Badge variant={STATUS_VARIANT_MAP[item.status] ?? "outline"} className="text-xs shrink-0">
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
                          <span className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 shrink-0">
                              <AvatarFallback dataSeed={item.employee.name} />
                            </Avatar>
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
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.task && (
                        <p className="text-xs text-muted-foreground/70 line-clamp-1">
                          {tTask("form.title")}: {item.task.title}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Dialogs */}
      <ScheduleDetailDialog
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        schedule={detailItem}
      />
      <TaskDetailDialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </div>
  );
}
