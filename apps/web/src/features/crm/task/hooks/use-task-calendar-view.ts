"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSchedules } from "@/features/crm/schedule/hooks/use-schedules";
import { useTasks } from "@/features/crm/task/hooks/use-tasks";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  fromIsoDateKey,
  getDatesFromDayKeys,
  groupItemsByDayKey,
  toDayKey,
  toIsoDateKey,
} from "@/features/crm/utils/calendar";
import { useCalendarSelection } from "@/features/crm/hooks/use-calendar-selection";
import type { Schedule } from "@/features/crm/schedule/types";
import type { Task } from "@/features/crm/task/types";

export function useTaskCalendarView() {
  const t = useTranslations("crmSchedule");
  const tTask = useTranslations("crmTask");

  const [detailItem, setDetailItem] = useState<Schedule | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const { selectedDate, calendarMonth, setSelectedDate, setCalendarMonth } = useCalendarSelection();

  const canViewLead = useUserPermission("crm_lead.read");
  const canViewDeal = useUserPermission("crm_deal.read");
  const canViewCustomer = useUserPermission("customer.read");

  const { data: allSchedulesRes, isLoading } = useSchedules({
    page: 1,
    per_page: 20,
    status: statusFilter || undefined,
  });

  const { data: overdueTasksRes } = useTasks({
    is_overdue: true,
    per_page: 50,
  });

  const allItems: Schedule[] = allSchedulesRes?.data ?? [];
  const overdueItems: Task[] = overdueTasksRes?.data ?? [];

  const scheduleDatesMap: Map<string, Schedule[]> = useMemo(
    () => groupItemsByDayKey(allItems, (item) => item.scheduled_at),
    [allItems],
  );

  const selectedDateSchedules: Schedule[] = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return scheduleDatesMap.get(toDayKey(selectedDate)) ?? [];
  }, [selectedDate, scheduleDatesMap]);

  const datesWithSchedules: Date[] = useMemo(
    () => getDatesFromDayKeys(scheduleDatesMap.keys()),
    [scheduleDatesMap],
  );

  const selectedDateTasks: Task[] = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const selectedDateKey = toIsoDateKey(selectedDate);
    return overdueItems.filter((task) => task.due_date === selectedDateKey);
  }, [selectedDate, overdueItems]);

  const selectedDateLabel: string = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : t("title");

  const handleOverdueTaskClick = useCallback(
    (task: Task) => {
      if (task.due_date) {
        const date = fromIsoDateKey(task.due_date);
        if (date) {
          setSelectedDate(date);
          setCalendarMonth(date);
        }
      }

      setSelectedTask(task);
    },
    [setCalendarMonth, setSelectedDate],
  );

  return {
    state: {
      selectedDate,
      calendarMonth,
      detailItem,
      selectedTask,
      statusFilter,
    },
    data: {
      isLoading,
      overdueItems,
      selectedDateSchedules,
      selectedDateTasks,
      datesWithSchedules,
      selectedDateLabel,
    },
    permissions: {
      canViewLead,
      canViewDeal,
      canViewCustomer,
    },
    actions: {
      setSelectedDate,
      setCalendarMonth,
      setDetailItem,
      setSelectedTask,
      setStatusFilter,
      handleOverdueTaskClick,
    },
    translations: {
      t,
      tTask,
    },
  };
}