"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceRecordService } from "../services/attendance-record-service";
import type {
  ClockInRequest,
  ClockOutRequest,
  ManualAttendanceRequest,
  UpdateAttendanceRequest,
  ListAttendanceRecordsParams,
} from "../types";

// Query key factory - consistent with visit feature pattern
export const attendanceKeys = {
  all: ["attendance"] as const,
  lists: () => [...attendanceKeys.all, "list"] as const,
  list: (params?: ListAttendanceRecordsParams) => [...attendanceKeys.lists(), params] as const,
  details: () => [...attendanceKeys.all, "detail"] as const,
  detail: (id: string) => [...attendanceKeys.details(), id] as const,
  today: () => [...attendanceKeys.all, "today"] as const,
  myStats: (params?: Record<string, unknown>) => [...attendanceKeys.all, "my-stats", params] as const,
  employeeStats: (id: string, params?: Record<string, unknown>) => [...attendanceKeys.all, "stats", id, params] as const,
  formData: () => [...attendanceKeys.all, "form-data"] as const,
} as const;

// Self-service hooks
export function useTodayAttendance() {
  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: () => attendanceRecordService.getTodayAttendance(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockInRequest) => attendanceRecordService.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockOutRequest) => attendanceRecordService.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useMyMonthlyStats(params?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: attendanceKeys.myStats(params),
    queryFn: () => attendanceRecordService.getMyMonthlyStats(params),
    staleTime: 1000 * 60 * 5,
  });
}

// Form data hook - replaces useAttendanceRecordReport
export function useAttendanceFormData() {
  return useQuery({
    queryKey: attendanceKeys.formData(),
    queryFn: () => attendanceRecordService.getFormData(),
    staleTime: 1000 * 60 * 10,
  });
}

// Admin hooks
export function useAttendanceRecords(params?: ListAttendanceRecordsParams) {
  return useQuery({
    queryKey: attendanceKeys.list(params),
    queryFn: () => attendanceRecordService.list(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceRecord(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: attendanceKeys.detail(id),
    queryFn: () => attendanceRecordService.getById(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useEmployeeMonthlyStats(
  employeeId: string,
  params?: { month?: number; year?: number }
) {
  return useQuery({
    queryKey: attendanceKeys.employeeStats(employeeId, params),
    queryFn: () => attendanceRecordService.getEmployeeMonthlyStats(employeeId, params),
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateManualAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ManualAttendanceRequest) =>
      attendanceRecordService.createManual(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttendanceRequest }) =>
      attendanceRecordService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.details() });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    },
  });
}

// Alias for calendar component compatibility
export function useCreateAttendanceRecord() {
  return useCreateManualAttendance();
}

// Backward compatibility alias
export function useAttendanceRecordReport() {
  return useAttendanceFormData();
}
