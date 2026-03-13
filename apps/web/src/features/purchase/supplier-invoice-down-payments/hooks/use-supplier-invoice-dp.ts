"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supplierInvoiceDPService } from "../services/supplier-invoice-dp-service";
import { purchaseOrderKeys } from "@/features/purchase/orders/hooks/use-purchase-orders";
import type { SupplierInvoiceDPDetail } from "../types";
import type { PurchaseOrderListItem, PurchaseOrderSISummary } from "@/features/purchase/orders/types";
import type {
  CreateSupplierInvoiceDPInput,
  SupplierInvoiceDPAuditTrailParams,
  SupplierInvoiceDPListParams,
  UpdateSupplierInvoiceDPInput,
} from "../types";

export const supplierInvoiceDPKeys = {
  all: ["supplier-invoice-dp"] as const,
  lists: () => [...supplierInvoiceDPKeys.all, "list"] as const,
  list: (params?: SupplierInvoiceDPListParams) => [...supplierInvoiceDPKeys.lists(), params] as const,
  details: () => [...supplierInvoiceDPKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierInvoiceDPKeys.details(), id] as const,
  addData: () => [...supplierInvoiceDPKeys.all, "add"] as const,
  auditTrails: () => [...supplierInvoiceDPKeys.all, "audit-trail"] as const,
  auditTrail: (id: string, params?: SupplierInvoiceDPAuditTrailParams) =>
    [...supplierInvoiceDPKeys.auditTrails(), id, params] as const,
};

function upsertInvoiceSummaryAtFront(
  invoices: PurchaseOrderSISummary[],
  next: PurchaseOrderSISummary,
): PurchaseOrderSISummary[] {
  const withoutCurrent = invoices.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyInvoiceDPToPurchaseOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  si: SupplierInvoiceDPDetail | undefined,
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
        const existing: PurchaseOrderSISummary[] = Array.isArray(po.supplier_invoices) ? po.supplier_invoices : [];
        const found = existing.find((entry) => entry.id === si.id);
        const nextEntry: PurchaseOrderSISummary = {
          id: si.id,
          code: si.code ?? found?.code ?? "",
          status: si.status ?? found?.status ?? "DRAFT",
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

export function useSupplierInvoiceDPs(params?: SupplierInvoiceDPListParams) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.list(params),
    queryFn: () => supplierInvoiceDPService.list(params),
  });
}

export function useSupplierInvoiceDP(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.detail(id),
    queryFn: () => supplierInvoiceDPService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useSupplierInvoiceDPAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.addData(),
    queryFn: () => supplierInvoiceDPService.addData(),
    enabled: options?.enabled !== undefined ? options.enabled : true,
    staleTime: 60_000,
  });
}

export function useCreateSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSupplierInvoiceDPInput) => supplierInvoiceDPService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      // Optimistically update PO list so DP count shows immediately
      try {
        const si: SupplierInvoiceDPDetail | undefined = res?.data;
        applyInvoiceDPToPurchaseOrderLists(queryClient, si);
      } catch {}
    },
  });
}

export function useUpdateSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierInvoiceDPInput }) =>
      supplierInvoiceDPService.update(id, data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(variables.id) });
      try {
        const si: SupplierInvoiceDPDetail | undefined = res?.data;
        applyInvoiceDPToPurchaseOrderLists(queryClient, si);
      } catch {}
    },
  });
}

export function useDeleteSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
    },
  });
}

export function usePendingSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.pending(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
      applyInvoiceDPToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useSubmitSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.submit(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
      applyInvoiceDPToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useApproveSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.approve(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
      applyInvoiceDPToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useRejectSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.reject(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
      applyInvoiceDPToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useCancelSupplierInvoiceDP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => supplierInvoiceDPService.cancel(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: supplierInvoiceDPKeys.auditTrails() });
      applyInvoiceDPToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}
export function useSupplierInvoiceDPAuditTrail(
  id: string,
  params?: SupplierInvoiceDPAuditTrailParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: supplierInvoiceDPKeys.auditTrail(id, params),
    queryFn: () => supplierInvoiceDPService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}