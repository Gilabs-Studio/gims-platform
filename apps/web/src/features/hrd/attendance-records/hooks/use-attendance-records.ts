"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceRecordService } from "../services/attendance-record-service";
import type { AttendanceRecordFormData } from "../schemas/attendance.schema";

const QUERY_KEYS = {
  attendanceRecords: (params?: unknown) => ["attendance-records", params],
  attendanceRecord: (id: number) => ["attendance-records", id],
  stats: () => ["attendance-records", "stats"],
  report: () => ["attendance-records", "report"],
} as const;

export function useAttendanceRecords(params?: {
  page?: number;
  limit?: number;
  search?: string;
  search_by?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceRecords(params),
    queryFn: () => attendanceRecordService.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAttendanceRecord(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.attendanceRecord(id),
    queryFn: () => attendanceRecordService.getById(id),
    enabled: id > 0,
  });
}

export function useAttendanceRecordStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats(),
    queryFn: () => attendanceRecordService.getStats(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendanceRecordReport() {
  return useQuery({
    queryKey: QUERY_KEYS.report(),
    queryFn: () => attendanceRecordService.getReport(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AttendanceRecordFormData) =>
      attendanceRecordService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AttendanceRecordFormData }) =>
      attendanceRecordService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}

export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => attendanceRecordService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
    },
  });
}
