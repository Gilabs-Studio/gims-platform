"use client";

import { useCallback, useState } from "react";
import { fromIsoDateKey } from "@/features/crm/utils/calendar";

export function useCalendarSelection(initialDate = new Date()) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [calendarMonth, setCalendarMonth] = useState<Date>(initialDate);

  const handleSelectDate = useCallback((date: Date | undefined) => {
    setSelectedDate(date ?? new Date());
  }, []);

  const handleMonthChange = useCallback((date: Date | undefined) => {
    setCalendarMonth(date ?? new Date());
  }, []);

  const focusDate = useCallback((dateKey: string | null | undefined) => {
    const date = fromIsoDateKey(dateKey);
    if (!date) {
      return;
    }

    setSelectedDate(date);
    setCalendarMonth(date);
  }, []);

  return {
    selectedDate,
    calendarMonth,
    setSelectedDate: handleSelectDate,
    setCalendarMonth: handleMonthChange,
    focusDate,
  };
}