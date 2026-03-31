"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSchedules } from "./use-schedules";
import { useCalendarSelection } from "@/features/crm/hooks/use-calendar-selection";
import { getDatesFromDayKeys, groupItemsByDayKey, toDayKey } from "@/features/crm/utils/calendar";
import type { Schedule } from "../types";

export function useScheduleCalendarView(statusFilter: string) {
  const t = useTranslations("crmSchedule");
  const [detailItem, setDetailItem] = useState<Schedule | null>(null);
  const { selectedDate, calendarMonth, setSelectedDate, setCalendarMonth } = useCalendarSelection();

  const { data: allSchedulesRes, isLoading } = useSchedules({
    page: 1,
    per_page: 20,
    status: statusFilter || undefined,
  });

  const allItems: Schedule[] = useMemo(() => allSchedulesRes?.data ?? [], [allSchedulesRes?.data]);

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

  const selectedDateLabel: string = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : t("title");

  return {
    state: {
      selectedDate,
      calendarMonth,
      detailItem,
    },
    data: {
      isLoading,
      selectedDateSchedules,
      datesWithSchedules,
      selectedDateLabel,
    },
    actions: {
      setSelectedDate,
      setCalendarMonth,
      setDetailItem,
    },
    translations: {
      t,
    },
  };
}