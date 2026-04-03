"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { overtimeService } from "../services/overtime-service";
import { attendanceRecordService } from "@/features/hrd/attendance-records/services/attendance-record-service";
import type {
  CreateOvertimeRequest,
  UpdateOvertimeRequest,
  ApproveOvertimeRequest,
  RejectOvertimeRequest,
  ListOvertimeParams,
} from "../types";

const QUERY_KEYS = {
  overtime: (params?: unknown) => ["overtime", params],
  overtimeById: (id: string) => ["overtime", id],
  mySummary: (params?: unknown) => ["overtime", "my-summary", params],
  pending: () => ["overtime", "pending"],
  notifications: () => ["overtime", "notifications"],
  employeeSummary: (id: string, params?: unknown) => [
    "overtime",
    "summary",
    id,
    params,
  ],
  formData: () => ["overtime", "form-data"],
} as const;

// Self-service hooks
export function useMyOvertimeSummary(params?: {
  month?: number;
  year?: number;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.mySummary(params),
    queryFn: () => overtimeService.getMySummary(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateOvertimeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOvertimeRequest) => overtimeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useCancelOvertimeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimeService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useMyOvertimeRequests(params?: ListOvertimeParams) {
  return useQuery({
    queryKey: QUERY_KEYS.overtime({ ...params, scope: "my" }),
    queryFn: () => overtimeService.getMyRequests(params),
    staleTime: 1000 * 60 * 5,
  });
}

// Manager/Admin hooks
export function useOvertimeRequests(params?: ListOvertimeParams) {
  return useQuery({
    queryKey: QUERY_KEYS.overtime(params),
    queryFn: () => overtimeService.list(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useOvertimeRequest(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.overtimeById(id),
    queryFn: () => overtimeService.getById(id),
    enabled: !!id,
  });
}

export function usePendingOvertimeRequests() {
  return useQuery({
    queryKey: QUERY_KEYS.pending(),
    queryFn: () => overtimeService.getPending(),
    staleTime: 1000 * 30, // 30 seconds - refresh frequently for approvals
  });
}

export function useOvertimeNotifications() {
  return useQuery({
    queryKey: QUERY_KEYS.notifications(),
    queryFn: () => overtimeService.getNotifications(),
    staleTime: 1000 * 30, // 30 seconds - polling for notifications
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

export function useApproveOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveOvertimeRequest }) =>
      overtimeService.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useRejectOvertime() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectOvertimeRequest }) =>
      overtimeService.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useUpdateOvertimeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOvertimeRequest }) =>
      overtimeService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.overtimeById(variables.id),
      });
    },
  });
}

export function useDeleteOvertimeRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => overtimeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overtime"] });
    },
  });
}

export function useEmployeeOvertimeSummary(
  employeeId: string,
  params?: { month?: number; year?: number },
) {
  return useQuery({
    queryKey: QUERY_KEYS.employeeSummary(employeeId, params),
    queryFn: () => overtimeService.getEmployeeSummary(employeeId, params),
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5,
  });
}

// Form data hook - fetches employees for selection
export function useOvertimeFormData() {
  return useQuery({
    queryKey: QUERY_KEYS.formData(),
    queryFn: () => attendanceRecordService.getFormData(),
    staleTime: 1000 * 60 * 10,
  });
}
