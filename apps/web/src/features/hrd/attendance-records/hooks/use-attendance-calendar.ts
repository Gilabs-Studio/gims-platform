"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useAttendanceRecords,
  useCreateAttendanceRecord,
  useUpdateAttendanceRecord,
  useDeleteAttendanceRecord,
} from "./use-attendance-records";
import { useHolidaysByYear } from "../../holidays/hooks/use-holidays";
import { toast } from "sonner";
import type { AttendanceRecordFormData } from "../schemas/attendance.schema";
import type { CalendarEvent } from "../types";
import {
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";

export function useAttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Calculate date range for the current month
  const startDate = useMemo(
    () => startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
    [currentDate]
  );
  const endDate = useMemo(
    () => endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
    [currentDate]
  );

  // Fetch attendance records for the current month
  const { data, isLoading } = useAttendanceRecords({
    date_from: format(startDate, "yyyy-MM-dd"),
    date_to: format(endDate, "yyyy-MM-dd"),
    per_page: 20, // Get all records for the month
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

  const createAttendanceRecord = useCreateAttendanceRecord();
  const updateAttendanceRecord = useUpdateAttendanceRecord();
  const deleteAttendanceRecord = useDeleteAttendanceRecord();

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
      checkInTime: record.check_in_time,
      checkOutTime: record.check_out_time,
      checkInType: record.check_in_type ?? "NORMAL",
      status: record.status,
      lateMinutes: record.late_minutes,
      workingHours: record.working_hours ?? "",
      notes: record.notes ?? "",
      isManualEntry: record.is_manual_entry ?? false,
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

  // Handle create attendance record
  const handleCreate = useCallback(
    async (formData: AttendanceRecordFormData) => {
      try {
        await createAttendanceRecord.mutateAsync(formData);
        setIsCreateDialogOpen(false);
        toast.success("Attendance record created successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    },
    [createAttendanceRecord]
  );

  // Handle update attendance record
  const handleUpdate = useCallback(
    async (formData: AttendanceRecordFormData) => {
      if (editingEvent) {
        try {
          await updateAttendanceRecord.mutateAsync({
            id: editingEvent.id,
            data: formData,
          });
          setEditingEvent(null);
          toast.success("Attendance record updated successfully");
        } catch {
          // Error already handled in api-client interceptor
        }
      }
    },
    [editingEvent, updateAttendanceRecord]
  );

  // Handle delete attendance record
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteAttendanceRecord.mutateAsync(id);
        setSelectedEvent(null);
        setDeletingEventId(null);
        toast.success("Attendance record deleted successfully");
      } catch {
        // Error already handled in api-client interceptor
      }
    },
    [deleteAttendanceRecord]
  );

  // Handle delete click - open delete dialog
  const handleDeleteClick = useCallback((id: string) => {
    setDeletingEventId(id);
    setSelectedEvent(null);
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  // Handle event edit
  const handleEventEdit = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedEvent(null);
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
    return events.filter((event) => format(event.date, "yyyy-MM-dd") === dateKey);
  }, [selectedDate, events]);

  // Close dialogs
  const closeCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingEvent(null);
  }, []);

  const closeDetailDialog = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeletingEventId(null);
  }, []);

  return {
    currentDate,
    selectedDate,
    selectedDateEvents,
    events,
    holidays,
    isLoading,
    selectedEvent,
    editingEvent,
    isCreateDialogOpen,
    deletingEventId,
    handlePreviousMonth,
    handleNextMonth,
    handleToday,
    handleDateClick,
    handleBackToMonth,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleDeleteClick,
    handleEventClick,
    handleEventEdit,
    setIsCreateDialogOpen,
    closeCreateDialog,
    closeEditDialog,
    closeDetailDialog,
    closeDeleteDialog,
  };
}
