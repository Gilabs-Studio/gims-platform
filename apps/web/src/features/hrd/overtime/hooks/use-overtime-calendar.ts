"use client";

import { useState, useCallback, useMemo } from "react";
import { useOvertimeRequests } from "./use-overtime";
import { useHolidaysByYear } from "../../holidays/hooks/use-holidays";
import type { CalendarEvent } from "../types";
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export function useOvertimeCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Calculate date range for the current month
  const startDate = useMemo(
    () => startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
    [currentDate],
  );
  const endDate = useMemo(
    () => endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
    [currentDate],
  );

  // Fetch overtime requests for the current month
  const { data, isLoading, refetch } = useOvertimeRequests({
    date_from: format(startDate, "yyyy-MM-dd"),
    date_to: format(endDate, "yyyy-MM-dd"),
    per_page: 100, // Get all records for the month
  });

  // Fetch holidays for the current calendar year
  const currentYear = currentDate.getFullYear();
  const { data: holidaysData } = useHolidaysByYear(currentYear);

  // Build a Map<dateKey, { name, type }> for quick holiday lookup
  const holidays = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    if (holidaysData?.data) {
      for (const holiday of holidaysData.data) {
        map.set(holiday.date, { name: holiday.name, type: holiday.type });
      }
    }
    return map;
  }, [holidaysData]);

  // Transform API data to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    if (!data?.data) return [];

    return data.data.map((record) => ({
      id: record.id,
      employeeId: record.employee_id,
      employeeName: record.employee_name ?? "Unknown",
      employeeCode: record.employee_code ?? "",
      divisionName: record.division_name,
      date: parseISO(record.date),
      startTime: record.start_time,
      endTime: record.end_time,
      plannedHours: record.planned_hours ?? "",
      status: record.status,
      requestType: record.request_type,
      reason: record.reason,
    }));
  }, [data]);

  // Navigate to previous month
  const handlePreviousMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  }, []);

  // Navigate to next month
  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  }, []);

  // Navigate to today
  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle date click - show day view
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  // Handle back to month view
  const handleBackToMonth = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return events.filter(
      (event) => format(event.date, "yyyy-MM-dd") === dateKey,
    );
  }, [selectedDate, events]);

  return {
    currentDate,
    selectedDate,
    selectedDateEvents,
    events,
    holidays,
    isLoading,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleDateClick,
    handleBackToMonth,
    refetch,
  };
}
