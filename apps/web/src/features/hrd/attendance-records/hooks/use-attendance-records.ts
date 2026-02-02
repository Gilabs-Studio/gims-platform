"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceRecordService } from "../services/attendance-record-service";
import type { 
  ClockInRequest, 
  ClockOutRequest, 
  ManualAttendanceRequest 
} from "../types";

const QUERY_KEYS = {
  attendanceRecords: (params?: unknown) => ["attendance-records", params],
  attendanceRecord: (id: string) => ["attendance-records", id],
  todayAttendance: () => ["attendance", "today"],
  myStats: (params?: unknown) => ["attendance", "my-stats", params],
  employeeStats: (id: string, params?: unknown) => ["attendance", "stats", id, params],
} as const;

// Self-service hooks
export function useTodayAttendance() {
  return useQuery({
    queryKey: QUERY_KEYS.todayAttendance(),
    queryFn: () => attendanceRecordService.getTodayAttendance(),
    staleTime: 1000 * 30, // 30 seconds - refresh frequently for clock in/out
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockInRequest) => attendanceRecordService.clockIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayAttendance() });
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockOutRequest) => attendanceRecordService.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.todayAttendance() });
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      queryClient.invalidateQueries({ queryKey: ["overtime"] }); // Overtime may be auto-detected
    },
  });
}

export function useMyMonthlyStats(params?: { month?: number; year?: number }) {
  return useQuery({
    queryKey: QUERY_KEYS.myStats(params),
    queryFn: () => attendanceRecordService.getMyMonthlyStats(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Admin hooks
export function useAttendanceRecords(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  employee_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceRecords(params),
    queryFn: () => attendanceRecordService.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAttendanceRecord(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceRecord(id),
    queryFn: () => attendanceRecordService.getById(id),
    enabled: !!id,
  });
}

export function useEmployeeMonthlyStats(
  employeeId: string,
  params?: { month?: number; year?: number }
) {
  return useQuery({
    queryKey: QUERY_KEYS.employeeStats(employeeId, params),
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
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ManualAttendanceRequest> }) =>
      attendanceRecordService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => attendanceRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

// Alias for calendar component compatibility
export function useCreateAttendanceRecord() {
  return useCreateManualAttendance();
}

// Report hook for admin forms
interface Employee {
  id: string;
  name: string;
}

interface ReportData {
  data: {
    employees: Employee[];
  };
}

export function useAttendanceRecordReport() {
  return useQuery<ReportData>({
    queryKey: ["attendance", "report-data"],
    queryFn: async () => {
      // Fetch employees for dropdown - this can be extended
      const response = await fetch("/api/v1/employees?per_page=100", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }
      const data = await response.json();
      return {
        data: {
          employees: data.data || [],
        },
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
