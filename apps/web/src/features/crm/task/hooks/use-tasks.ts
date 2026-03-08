"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "../services/task-service";
import type {
  TaskListParams,
  CreateTaskData,
  UpdateTaskData,
  AssignTaskData,
  CreateReminderData,
  UpdateReminderData,
} from "../types";

export const taskKeys = {
  all: ["crm-tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  formData: () => [...taskKeys.all, "form-data"] as const,
  reminders: (taskId: string) => [...taskKeys.all, "reminders", taskId] as const,
};

export function useTasks(params: TaskListParams = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => taskService.list(params),
  });
}

export function useTaskById(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => taskService.getById(id),
    enabled: !!id,
  });
}

export function useTaskFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskKeys.formData(),
    queryFn: () => taskService.getFormData(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskData) => taskService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskData }) =>
      taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useAssignTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTaskData }) =>
      taskService.assign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useMarkTaskInProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskService.markInProgress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Reminder hooks
export function useTaskReminders(taskId: string) {
  return useQuery({
    queryKey: taskKeys.reminders(taskId),
    queryFn: () => taskService.listReminders(taskId),
    enabled: !!taskId,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: CreateReminderData }) =>
      taskService.createReminder(taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.reminders(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      reminderId,
      data,
    }: {
      taskId: string;
      reminderId: string;
      data: UpdateReminderData;
    }) => taskService.updateReminder(taskId, reminderId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.reminders(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, reminderId }: { taskId: string; reminderId: string }) =>
      taskService.deleteReminder(taskId, reminderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.reminders(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.details() });
    },
  });
}

// Scoped task queries for lead/deal detail tabs
export function useTasksByLead(leadId: string, params?: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list({ lead_id: leadId, per_page: 20, ...params }),
    queryFn: () => taskService.list({ lead_id: leadId, per_page: 20, ...params }),
    enabled: !!leadId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTasksByDeal(dealId: string, params?: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list({ deal_id: dealId, per_page: 20, ...params }),
    queryFn: () => taskService.list({ deal_id: dealId, per_page: 20, ...params }),
    enabled: !!dealId,
    staleTime: 2 * 60 * 1000,
  });
}
