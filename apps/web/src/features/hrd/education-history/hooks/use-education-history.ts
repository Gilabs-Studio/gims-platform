"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { educationHistoryService } from "../services/education-history-service";
import type {
  ListEducationHistoriesParams,
  CreateEducationHistoryData,
  UpdateEducationHistoryData,
} from "../types";

// Query keys
export const educationHistoryKeys = {
  all: ["employee-education-histories"] as const,
  lists: () => [...educationHistoryKeys.all, "list"] as const,
  list: (params?: ListEducationHistoriesParams) =>
    [...educationHistoryKeys.lists(), params] as const,
  details: () => [...educationHistoryKeys.all, "detail"] as const,
  detail: (id: string) => [...educationHistoryKeys.details(), id] as const,
  byEmployee: (employeeId: string) =>
    [...educationHistoryKeys.all, "by-employee", employeeId] as const,
  formData: () => [...educationHistoryKeys.all, "form-data"] as const,
};

// List education histories hook with filters
export function useEducationHistories(params?: ListEducationHistoriesParams) {
  return useQuery({
    queryKey: educationHistoryKeys.list(params),
    queryFn: () => educationHistoryService.list(params),
  });
}

// Get education history by ID hook
export function useEducationHistory(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: educationHistoryKeys.detail(id),
    queryFn: () => educationHistoryService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get education histories by employee ID
export function useEducationHistoriesByEmployee(
  employeeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: educationHistoryKeys.byEmployee(employeeId),
    queryFn: () => educationHistoryService.getByEmployeeId(employeeId),
    enabled: options?.enabled !== undefined ? options.enabled : !!employeeId,
  });
}

// Get form data (employees + degree levels)
export function useEducationHistoryFormData() {
  return useQuery({
    queryKey: educationHistoryKeys.formData(),
    queryFn: () => educationHistoryService.getFormData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create education history mutation
export function useCreateEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEducationHistoryData) =>
      educationHistoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: educationHistoryKeys.lists(),
      });
    },
  });
}

// Update education history mutation
export function useUpdateEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateEducationHistoryData;
    }) => educationHistoryService.update(id, data),
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: educationHistoryKeys.detail(id),
      });

      // Snapshot the previous value
      const previousEducation = queryClient.getQueryData(
        educationHistoryKeys.detail(id)
      );

      return { previousEducation };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousEducation) {
        queryClient.setQueryData(
          educationHistoryKeys.detail(id),
          context.previousEducation
        );
      }
    },
    onSettled: (_data, _error, { id }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: educationHistoryKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: educationHistoryKeys.lists(),
      });
    },
  });
}

// Delete education history mutation
export function useDeleteEducationHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => educationHistoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: educationHistoryKeys.lists(),
      });
    },
  });
}
