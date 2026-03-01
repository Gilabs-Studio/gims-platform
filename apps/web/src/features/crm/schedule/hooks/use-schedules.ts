"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleService } from "../services/schedule-service";
import type { ScheduleListParams, CreateScheduleData, UpdateScheduleData } from "../types";

export const scheduleKeys = {
  all: ["crm-schedules"] as const,
  lists: () => [...scheduleKeys.all, "list"] as const,
  list: (params: ScheduleListParams) => [...scheduleKeys.lists(), params] as const,
  details: () => [...scheduleKeys.all, "detail"] as const,
  detail: (id: string) => [...scheduleKeys.details(), id] as const,
  formData: () => [...scheduleKeys.all, "form-data"] as const,
};

export function useSchedules(params: ScheduleListParams = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(params),
    queryFn: () => scheduleService.list(params),
  });
}

export function useScheduleById(id: string) {
  return useQuery({
    queryKey: scheduleKeys.detail(id),
    queryFn: () => scheduleService.getById(id),
    enabled: !!id,
  });
}

export function useScheduleFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: scheduleKeys.formData(),
    queryFn: () => scheduleService.getFormData(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleData) => scheduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleData }) =>
      scheduleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() });
    },
  });
}
