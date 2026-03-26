"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoiceService } from "../services/invoice-service";
import { orderKeys } from "../../order/hooks/use-orders";
import type { CustomerInvoiceSummary, SalesOrderListResponse } from "../../order/types";
import type {
  ListCustomerInvoicesParams,
  ListCustomerInvoiceItemsParams,
  CreateCustomerInvoiceData,
  UpdateCustomerInvoiceData,
  UpdateCustomerInvoiceStatusData,
  CustomerInvoice,
  CustomerInvoiceListResponse,
} from "../types";

function upsertCustomerInvoiceSummaryAtFront(
  invoices: CustomerInvoiceSummary[],
  next: CustomerInvoiceSummary,
): CustomerInvoiceSummary[] {
  const withoutCurrent = invoices.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyCustomerInvoiceToSalesOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  invoice: CustomerInvoice | undefined,
) {
  const salesOrderId = invoice?.sales_order_id ?? invoice?.sales_order?.id;
  if (!invoice || !salesOrderId) return;

  const queries = queryClient.getQueriesData({ queryKey: orderKeys.lists() });
  queries.forEach(([key, old]) => {
    if (!old || typeof old !== "object" || !("data" in (old as Record<string, unknown>))) return;
    queryClient.setQueryData(key as readonly unknown[], (prev: unknown) => {
      if (!prev || typeof prev !== "object" || !("data" in (prev as Record<string, unknown>))) return prev;
      const list = prev as SalesOrderListResponse;
      return {
        ...list,
        data: list.data.map((order) => {
          if (order.id !== salesOrderId) return order;
          const existing = Array.isArray(order.customer_invoices) ? order.customer_invoices : [];
          const found = existing.find((entry) => entry.id === invoice.id);
          const nextEntry: CustomerInvoiceSummary = {
            id: invoice.id,
            code: invoice.code ?? found?.code ?? "",
            status: invoice.status ?? found?.status ?? "draft",
            invoice_date: invoice.invoice_date ?? found?.invoice_date ?? "",
            due_date: invoice.due_date ?? found?.due_date ?? "",
            amount: invoice.amount ?? found?.amount ?? 0,
            paid_amount: invoice.paid_amount ?? found?.paid_amount ?? 0,
          };

          return {
            ...order,
            customer_invoices: upsertCustomerInvoiceSummaryAtFront(existing, nextEntry),
          };
        }),
      } as SalesOrderListResponse;
    });
  });
}

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
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...invoiceKeys.detail(id), "audit-trail", params] as const,
};

// List invoices hook with filters
export function useInvoices(params?: ListCustomerInvoicesParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoiceService.list(params),
    enabled: options?.enabled ?? true,
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

export function useInvoiceAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: invoiceKeys.auditTrail(id, params),
    queryFn: () => invoiceService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}

// Create invoice mutation
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInvoiceData) => invoiceService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      applyCustomerInvoiceToSalesOrderLists(queryClient, res?.data);
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
    onSuccess: (res, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      applyCustomerInvoiceToSalesOrderLists(queryClient, res?.data);
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
    onSuccess: (res, variables) => {
      // Invalidate detail query
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      applyCustomerInvoiceToSalesOrderLists(queryClient, res?.data);
    },
  });
}

// Approve invoice mutation (requires customer_invoice.approve permission)
export function useApproveInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceService.approve(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      applyCustomerInvoiceToSalesOrderLists(queryClient, res?.data);
    },
  });
}

