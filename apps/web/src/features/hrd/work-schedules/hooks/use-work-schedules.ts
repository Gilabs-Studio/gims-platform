"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workScheduleService } from "../services/work-schedule-service";
import type { 
  CreateWorkScheduleRequest, 
  UpdateWorkScheduleRequest 
} from "../types";

const QUERY_KEYS = {
  workSchedules: (params?: unknown) => ["work-schedules", params],
  workSchedule: (id: string) => ["work-schedules", id],
  defaultSchedule: () => ["work-schedules", "default"],
} as const;

export function useWorkSchedules(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_order?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.workSchedules(params),
    queryFn: () => workScheduleService.list(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useWorkSchedule(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workSchedule(id),
    queryFn: () => workScheduleService.getById(id),
    enabled: !!id,
  });
}

export function useDefaultWorkSchedule() {
  return useQuery({
    queryKey: QUERY_KEYS.defaultSchedule(),
    queryFn: () => workScheduleService.getDefault(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkScheduleRequest) =>
      workScheduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}

export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkScheduleRequest }) =>
      workScheduleService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.workSchedule(variables.id) 
      });
    },
  });
}

export function useSetDefaultWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workScheduleService.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}

export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workScheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}
