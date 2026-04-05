"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orderKeys } from "../../order/hooks/use-orders";
import type { CustomerInvoiceSummary, SalesOrder, SalesOrderListResponse } from "../../order/types";
import { customerInvoiceDPService } from "../services/customer-invoice-dp-service";
import { getSalesErrorMessage } from "../../utils/error-utils";
import type {
  CreateCustomerInvoiceDPInput,
  CustomerInvoiceDPDetail,
  CustomerInvoiceDPListParams,
  UpdateCustomerInvoiceDPInput,
} from "../types";

export const customerInvoiceDPKeys = {
  all: ["customer-invoice-dp"] as const,
  lists: () => [...customerInvoiceDPKeys.all, "list"] as const,
  list: (params?: CustomerInvoiceDPListParams) => [...customerInvoiceDPKeys.lists(), params] as const,
  details: () => [...customerInvoiceDPKeys.all, "detail"] as const,
  detail: (id: string) => [...customerInvoiceDPKeys.details(), id] as const,
  addData: () => [...customerInvoiceDPKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...customerInvoiceDPKeys.all, "audit-trail", id, params] as const,
};

function upsertCustomerInvoiceSummaryAtFront(
  invoices: CustomerInvoiceSummary[],
  next: CustomerInvoiceSummary,
): CustomerInvoiceSummary[] {
  const withoutCurrent = invoices.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyDPToSalesOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  dp: CustomerInvoiceDPDetail | undefined,
) {
  const salesOrderId = dp?.sales_order?.id;
  if (!dp || !salesOrderId) return;

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
          const found = existing.find((entry) => entry.id === dp.id);
          const nextEntry: CustomerInvoiceSummary = {
            id: dp.id,
            code: dp.code ?? found?.code ?? "",
            status: dp.status ?? found?.status ?? "DRAFT",
            invoice_date: dp.invoice_date ?? found?.invoice_date ?? "",
            due_date: dp.due_date ?? found?.due_date ?? "",
            amount: dp.amount ?? found?.amount ?? 0,
            paid_amount: (dp.amount ?? 0) - (dp.remaining_amount ?? dp.amount ?? 0),
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

export function useCustomerInvoiceDPs(params?: CustomerInvoiceDPListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.list(params),
    queryFn: () => customerInvoiceDPService.list(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useCustomerInvoiceDP(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.detail(id),
    queryFn: () => customerInvoiceDPService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCustomerInvoiceDPAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.addData(),
    queryFn: () => customerInvoiceDPService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInvoiceDPInput) => customerInvoiceDPService.create(data),
    onMutate: async (newDP) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.lists() });
      const previous = queryClient.getQueryData<SalesOrderListResponse | undefined>(orderKeys.lists());

      queryClient.setQueriesData({ queryKey: orderKeys.lists() }, (old?: SalesOrderListResponse) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((order: SalesOrder) => {
            if (order.id !== newDP.sales_order_id) return order;
            const tmpInvoice = {
              id: `tmp-${Date.now()}`,
              code: "",
              status: "DRAFT",
              invoice_date: newDP.invoice_date,
              due_date: newDP.due_date,
              amount: newDP.amount,
              paid_amount: newDP.amount,
            };
            return { ...order, customer_invoices: [...(order.customer_invoices ?? []), tmpInvoice] };
          }),
        };
      });

      return { previous };
    },
    onError: (error, _newDP, context?: { previous?: SalesOrderListResponse | undefined }) => {
      if (context?.previous) {
        queryClient.setQueriesData({ queryKey: orderKeys.lists() }, context.previous);
      }
      toast.error(getSalesErrorMessage(error, "Failed to create down payment invoice"));
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      applyDPToSalesOrderLists(queryClient, response?.data);
      const soId = response?.data?.sales_order?.id;
      if (soId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(soId) });
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
}

export function useUpdateCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerInvoiceDPInput }) =>
      customerInvoiceDPService.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.detail(variables.id) });
      applyDPToSalesOrderLists(queryClient, response?.data);
      const soId = response?.data?.sales_order?.id;
      if (soId) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(soId) });
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      }
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to update down payment invoice"));
    },
  });
}

export function useDeleteCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerInvoiceDPService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to delete down payment invoice"));
    },
  });
}

export function usePendingCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerInvoiceDPService.pending(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.detail(id) });
      applyDPToSalesOrderLists(queryClient, response?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to set down payment invoice to pending"));
    },
  });
}

export function useApproveCustomerInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerInvoiceDPService.approve(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerInvoiceDPKeys.detail(id) });
      applyDPToSalesOrderLists(queryClient, response?.data);
    },
    onError: (error) => {
      toast.error(getSalesErrorMessage(error, "Failed to approve down payment invoice"));
    },
  });
}

export function useCustomerInvoiceDPAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: customerInvoiceDPKeys.auditTrail(id, params),
    queryFn: () => customerInvoiceDPService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
    placeholderData: (previousData) => previousData,
  });
}
