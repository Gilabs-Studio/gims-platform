import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activityService } from "../services/activity-service";
import type { ActivityListParams, CreateActivityData } from "../types";

const QUERY_KEY = "crm-activities";

export const activityKeys = {
  all: [QUERY_KEY] as const,
  lists: () => [...activityKeys.all, "list"] as const,
  list: (params: ActivityListParams) => [...activityKeys.lists(), params] as const,
  details: () => [...activityKeys.all, "detail"] as const,
  detail: (id: string) => [...activityKeys.details(), id] as const,
  timeline: (params: ActivityListParams) => [...activityKeys.all, "timeline", params] as const,
};

export function useActivities(params?: ActivityListParams) {
  return useQuery({
    queryKey: activityKeys.list(params ?? {}),
    queryFn: () => activityService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivityById(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => activityService.getById(id),
    enabled: !!id,
  });
}

export function useActivityTimeline(params?: ActivityListParams) {
  return useQuery({
    queryKey: activityKeys.timeline(params ?? {}),
    queryFn: () => activityService.timeline(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateActivityData) => activityService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}
