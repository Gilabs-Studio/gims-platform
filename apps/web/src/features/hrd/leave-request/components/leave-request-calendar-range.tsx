"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

interface LeaveRequestCalendarRangeProps {
  readonly range?: DateRange;
  readonly className?: string;
}

export function LeaveRequestCalendarRange({ range, className }: LeaveRequestCalendarRangeProps) {
  const initialMonth = useMemo(() => {
    const from = range?.from;
    return from
      ? new Date(from.getFullYear(), from.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [range?.from]);

  const [month, setMonth] = useState<Date>(initialMonth);

  useEffect(() => {
    setMonth(initialMonth);
  }, [initialMonth]);

  const handleMonthChange = useCallback((nextMonth: Date | undefined) => {
    if (nextMonth) setMonth(nextMonth);
  }, []);

  return (
    <Calendar
      mode="range"
      selected={range}
      month={month}
      onMonthChange={handleMonthChange}
      numberOfMonths={2}
      pagedNavigation
      className={className}
    />
  );
}