"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoice-service";
import type {
  ListCustomerInvoicesParams,
  ListCustomerInvoiceItemsParams,
  CreateCustomerInvoiceData,
  UpdateCustomerInvoiceData,
  UpdateCustomerInvoiceStatusData,
  RecordPaymentData,
  CustomerInvoice,
  CustomerInvoiceListResponse,
} from "../types";

// Query keys
export const invoiceKeys = {
  all: ["customer-invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params?: ListCustomerInvoicesParams) =>
    [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  items: (id: string, params?: ListCustomerInvoiceItemsParams) =>
    [...invoiceKeys.detail(id), "items", params] as const,
};

// List invoices hook with filters
export function useInvoices(params?: ListCustomerInvoicesParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoiceService.list(params),
  });
}

// Get invoice by ID hook
export function useInvoice(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoiceService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

// Get invoice items with server-side pagination
export function useInvoiceItems(
  id: string,
  params?: ListCustomerInvoiceItemsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: invoiceKeys.items(id, params),
    queryFn: () => invoiceService.getItems(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    // Keep previous data when changing pages for smooth transitions
    placeholderData: (previousData) => previousData,
  });
}

// Create invoice mutation
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInvoiceData) => invoiceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Update invoice mutation
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInvoiceData }) =>
      invoiceService.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.lists() });

      // Update all list caches optimistically
      queryClient.setQueriesData(
        { queryKey: invoiceKeys.lists() },
        (old: CustomerInvoiceListResponse | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((invoice: CustomerInvoice) =>
              invoice.id === id ? { ...invoice, ...data } : invoice
            ),
          };
        }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
    onError: () => {
      // Refetch on error to revert optimistic update
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Delete invoice mutation
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Update invoice status mutation
export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateCustomerInvoiceStatusData;
    }) => invoiceService.updateStatus(id, data),
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// Record payment mutation
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: RecordPaymentData;
    }) => invoiceService.recordPayment(id, data),
    onSuccess: (_, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
