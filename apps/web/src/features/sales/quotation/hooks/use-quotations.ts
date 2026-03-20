"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationService } from "../services/quotation-service";
import type {
  ListSalesQuotationsParams,
  ListSalesQuotationItemsParams,
  CreateSalesQuotationData,
  UpdateSalesQuotationData,
  UpdateSalesQuotationStatusData,
  SalesQuotation,
  SalesQuotationListResponse,
} from "../types";

// Query keys
export const quotationKeys = {
  all: ["sales-quotations"] as const,
  lists: () => [...quotationKeys.all, "list"] as const,
  list: (params?: ListSalesQuotationsParams) =>
    [...quotationKeys.lists(), params] as const,
  details: () => [...quotationKeys.all, "detail"] as const,
  detail: (id: string) => [...quotationKeys.details(), id] as const,
  items: (id: string, params?: ListSalesQuotationItemsParams) =>
    [...quotationKeys.detail(id), "items", params] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...quotationKeys.detail(id), "audit-trail", params] as const,
};

// List quotations hook with filters
export function useQuotations(params?: ListSalesQuotationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quotationKeys.list(params),
    queryFn: () => quotationService.list(params),
    enabled: options?.enabled,
  });
}

// Get quotation by ID hook
export function useQuotation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: () => quotationService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get quotation items with server-side pagination
export function useQuotationItems(
  id: string,
  params?: ListSalesQuotationItemsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: quotationKeys.items(id, params),
    queryFn: () => quotationService.getItems(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    // Keep previous data when changing pages for smooth transitions
    placeholderData: (previousData) => previousData,
  });
}

export function useQuotationAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: quotationKeys.auditTrail(id, params),
    queryFn: () => quotationService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}


// Create quotation mutation
export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSalesQuotationData) => quotationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

// Update quotation mutation
export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSalesQuotationData }) =>
      quotationService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: quotationKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: quotationKeys.lists() },
        (old: SalesQuotationListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((quotation: SalesQuotation) =>
              quotation.id === id ? { ...quotation, ...data } : quotation
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: quotationKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
    onError: () => {
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

// Delete quotation mutation
export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => quotationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}

// Update quotation status mutation
export function useUpdateQuotationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSalesQuotationStatusData;
    }) => quotationService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: quotationKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
}
