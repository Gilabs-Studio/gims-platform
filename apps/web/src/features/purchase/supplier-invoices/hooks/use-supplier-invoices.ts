"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierInvoicesService } from "../services/supplier-invoices-service";
import { purchaseOrderKeys } from "@/features/purchase/orders/hooks/use-purchase-orders";
import type { SupplierInvoiceDetail } from "../types";
import type { PurchaseOrderListItem } from "@/features/purchase/orders/types";
import type {
  CreateSupplierInvoiceInput,
  SupplierInvoiceListParams,
  UpdateSupplierInvoiceInput,
} from "../types";

export const supplierInvoiceKeys = {
  all: ["supplier-invoices"] as const,
  lists: () => [...supplierInvoiceKeys.all, "list"] as const,
  list: (params?: SupplierInvoiceListParams) => [...supplierInvoiceKeys.lists(), params] as const,
  details: () => [...supplierInvoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierInvoiceKeys.details(), id] as const,
  addData: () => [...supplierInvoiceKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...supplierInvoiceKeys.all, "audit-trail", id, params] as const,
};

function upsertInvoiceSummaryAtFront(
  invoices: NonNullable<PurchaseOrderListItem["supplier_invoices"]>,
  next: {
    id: string;
    code: string;
    status: string;
    goods_receipt_id?: string | null;
    goods_receipt_code?: string | null;
  },
): NonNullable<PurchaseOrderListItem["supplier_invoices"]> {
  const withoutCurrent = invoices.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyInvoiceToPurchaseOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  si: SupplierInvoiceDetail | undefined,
) {
  const poId = si?.purchase_order?.id ?? null;
  if (!si || !poId) return;

  const queries = queryClient.getQueriesData({ queryKey: purchaseOrderKeys.lists() });
  queries.forEach(([key, old]) => {
    if (!old || typeof old !== "object" || !("data" in (old as Record<string, unknown>))) return;
    queryClient.setQueryData(key as readonly unknown[], (prev: unknown) => {
      if (!prev || typeof prev !== "object" || !("data" in (prev as Record<string, unknown>))) return prev;
      const p = prev as { data: PurchaseOrderListItem[] };
      const newData = p.data.map((po) => {
        if (po.id !== poId) return po;
        const existing = Array.isArray(po.supplier_invoices) ? po.supplier_invoices : [];
        const found = existing.find((entry) => entry.id === si.id);
        const nextEntry = {
          id: si.id,
          code: si.code ?? found?.code ?? "",
          status: si.status ?? found?.status ?? "DRAFT",
          goods_receipt_id: si.goods_receipt?.id ?? found?.goods_receipt_id ?? null,
          goods_receipt_code: si.goods_receipt?.code ?? found?.goods_receipt_code ?? null,
        };
        return {
          ...po,
          supplier_invoices: upsertInvoiceSummaryAtFront(existing, nextEntry),
        } as PurchaseOrderListItem;
      });
      return { ...p, data: newData } as { data: PurchaseOrderListItem[] };
    });
  });
}

export function useSupplierInvoices(params?: SupplierInvoiceListParams) {
  return useQuery({
    queryKey: supplierInvoiceKeys.list(params),
    queryFn: () => supplierInvoicesService.list(params),
  });
}

export function useSupplierInvoice(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceKeys.detail(id),
    queryFn: () => supplierInvoicesService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useSupplierInvoiceAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceKeys.addData(),
    queryFn: () => supplierInvoicesService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceInput) => supplierInvoicesService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      // Invalidate PO queries so the SI linked dialogs refresh
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });

      // Optimistically update any cached purchase order list entries that match the PO
      try {
        const si: SupplierInvoiceDetail | undefined = res?.data;
        applyInvoiceToPurchaseOrderLists(queryClient, si);
      } catch {}
    },
  });
}

export function useUpdateSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInvoiceInput }) =>
      supplierInvoicesService.update(id, data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(variables.id) });
      // Update PO list entries to reflect updated SI status/code if present
      try {
        const si: SupplierInvoiceDetail | undefined = res?.data;
        applyInvoiceToPurchaseOrderLists(queryClient, si);
      } catch {}
    },
  });
}

export function useDeleteSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
    },
  });
}

export function usePendingSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.pending(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
      applyInvoiceToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useSubmitSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.submit(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
      applyInvoiceToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useApproveSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.approve(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
      applyInvoiceToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useRejectSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.reject(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
      applyInvoiceToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useCancelSupplierInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoicesService.cancel(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceKeys.detail(id) });
      applyInvoiceToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useSupplierInvoiceAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: supplierInvoiceKeys.auditTrail(id, params),
    queryFn: () => supplierInvoicesService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
