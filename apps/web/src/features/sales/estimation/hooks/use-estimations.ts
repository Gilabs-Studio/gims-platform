"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimationService } from "../services/estimation-service";
import type {
  ListSalesEstimationsParams,
  ListSalesEstimationItemsParams,
  CreateSalesEstimationData,
  UpdateSalesEstimationData,
  UpdateSalesEstimationStatusData,
  ConvertToQuotationData,
  SalesEstimation,
  SalesEstimationListResponse,
} from "../types";

// Query keys
export const estimationKeys = {
  all: ["sales-estimations"] as const,
  lists: () => [...estimationKeys.all, "list"] as const,
  list: (params?: ListSalesEstimationsParams) =>
    [...estimationKeys.lists(), params] as const,
  details: () => [...estimationKeys.all, "detail"] as const,
  detail: (id: string) => [...estimationKeys.details(), id] as const,
  items: (id: string, params?: ListSalesEstimationItemsParams) =>
    [...estimationKeys.detail(id), "items", params] as const,
};

// List estimations hook with filters
export function useEstimations(params?: ListSalesEstimationsParams) {
  return useQuery({
    queryKey: estimationKeys.list(params),
    queryFn: () => estimationService.list(params),
  });
}

// Get estimation by ID hook
export function useEstimation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: estimationKeys.detail(id),
    queryFn: () => estimationService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get estimation items with server-side pagination
export function useEstimationItems(
  id: string,
  params?: ListSalesEstimationItemsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: estimationKeys.items(id, params),
    queryFn: () => estimationService.getItems(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    // Keep previous data when changing pages for smooth transitions
    placeholderData: (previousData) => previousData,
  });
}

// Create estimation mutation
export function useCreateEstimation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesEstimationData) => estimationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
    },
  });
}

// Update estimation mutation
export function useUpdateEstimation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesEstimationData }) =>
      estimationService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: estimationKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: estimationKeys.lists() },
        (old: SalesEstimationListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((estimation: SalesEstimation) =>
              estimation.id === id ? { ...estimation, ...data } : estimation
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: estimationKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
    },
    onError: () => {
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
    },
  });
}

// Delete estimation mutation
export function useDeleteEstimation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => estimationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
    },
  });
}

// Update estimation status mutation
export function useUpdateEstimationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSalesEstimationStatusData;
    }) => estimationService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: estimationKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
    },
  });
}

// Convert to quotation mutation
export function useConvertToQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ConvertToQuotationData;
    }) => estimationService.convertToQuotation(id, data),
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: estimationKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: estimationKeys.lists() });
      // Also invalidate quotation lists
      queryClient.invalidateQueries({ queryKey: ["sales-quotations"] });
    },
  });
}
