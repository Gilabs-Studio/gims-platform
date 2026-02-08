"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recruitmentService } from "../services/recruitment-service";
import type {
  ListRecruitmentRequestsParams,
  CreateRecruitmentRequestData,
  UpdateRecruitmentRequestData,
  UpdateRecruitmentStatusData,
  UpdateFilledCountData,
  RecruitmentRequest,
  RecruitmentRequestListResponse,
} from "../types";

// Query keys
export const recruitmentKeys = {
  all: ["recruitment-requests"] as const,
  lists: () => [...recruitmentKeys.all, "list"] as const,
  list: (params?: ListRecruitmentRequestsParams) =>
    [...recruitmentKeys.lists(), params] as const,
  details: () => [...recruitmentKeys.all, "detail"] as const,
  detail: (id: string) => [...recruitmentKeys.details(), id] as const,
  formData: () => [...recruitmentKeys.all, "form-data"] as const,
};

// List recruitment requests
export function useRecruitmentRequests(params?: ListRecruitmentRequestsParams) {
  return useQuery({
    queryKey: recruitmentKeys.list(params),
    queryFn: () => recruitmentService.list(params),
  });
}

// Get single recruitment request
export function useRecruitmentRequest(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: recruitmentKeys.detail(id),
    queryFn: () => recruitmentService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get form data for dropdowns
export function useRecruitmentFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: recruitmentKeys.formData(),
    queryFn: () => recruitmentService.getFormData(),
    enabled: options?.enabled,
  });
}

// Create recruitment request
export function useCreateRecruitmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecruitmentRequestData) =>
      recruitmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
  });
}

// Update recruitment request
export function useUpdateRecruitmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRecruitmentRequestData;
    }) => recruitmentService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: recruitmentKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: recruitmentKeys.lists() },
        (old: RecruitmentRequestListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((req: RecruitmentRequest) =>
              req.id === id ? { ...req, ...data } : req
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recruitmentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
  });
}

// Delete recruitment request
export function useDeleteRecruitmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recruitmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
  });
}

// Update recruitment status
export function useUpdateRecruitmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRecruitmentStatusData;
    }) => recruitmentService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recruitmentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
  });
}

// Update filled count
export function useUpdateFilledCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFilledCountData;
    }) => recruitmentService.updateFilledCount(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: recruitmentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: recruitmentKeys.lists() });
    },
  });
}
