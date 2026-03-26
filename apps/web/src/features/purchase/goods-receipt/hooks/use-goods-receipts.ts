"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goodsReceiptsService } from "../services/goods-receipts-service";
import { purchaseOrderKeys } from "../../orders/hooks/use-purchase-orders";
import type { PurchaseOrderGRSummary, PurchaseOrderListItem } from "../../orders/types";
import type {
  CreateGoodsReceiptInput,
  GoodsReceiptDetail,
  GoodsReceiptListParams,
  UpdateGoodsReceiptInput,
} from "../types";

function upsertGoodsReceiptSummaryAtFront(
  receipts: PurchaseOrderGRSummary[],
  next: PurchaseOrderGRSummary,
): PurchaseOrderGRSummary[] {
  const withoutCurrent = receipts.filter((entry) => entry.id !== next.id);
  return [next, ...withoutCurrent];
}

function applyGoodsReceiptToPurchaseOrderLists(
  queryClient: ReturnType<typeof useQueryClient>,
  goodsReceipt: GoodsReceiptDetail | undefined,
) {
  const purchaseOrderId = goodsReceipt?.purchase_order?.id;
  if (!goodsReceipt || !purchaseOrderId) return;

  const totalItemsReceived = Array.isArray(goodsReceipt.items)
    ? goodsReceipt.items.reduce((sum, item) => sum + (item.quantity_received ?? 0), 0)
    : 0;

  const queries = queryClient.getQueriesData({ queryKey: purchaseOrderKeys.lists() });
  queries.forEach(([key, old]) => {
    if (!old || typeof old !== "object" || !("data" in (old as Record<string, unknown>))) return;
    queryClient.setQueryData(key as readonly unknown[], (prev: unknown) => {
      if (!prev || typeof prev !== "object" || !("data" in (prev as Record<string, unknown>))) return prev;
      const list = prev as { data: PurchaseOrderListItem[] };
      return {
        ...list,
        data: list.data.map((purchaseOrder) => {
          if (purchaseOrder.id !== purchaseOrderId) return purchaseOrder;
          const existing = Array.isArray(purchaseOrder.goods_receipts) ? purchaseOrder.goods_receipts : [];
          const found = existing.find((entry) => entry.id === goodsReceipt.id);
          const nextEntry: PurchaseOrderGRSummary = {
            id: goodsReceipt.id,
            code: goodsReceipt.code ?? found?.code ?? "",
            status: goodsReceipt.status ?? found?.status ?? "DRAFT",
            total_items: goodsReceipt.items?.length ?? found?.total_items,
            total_items_received: totalItemsReceived || found?.total_items_received,
          };

          return {
            ...purchaseOrder,
            goods_receipts: upsertGoodsReceiptSummaryAtFront(existing, nextEntry),
          };
        }),
      } as { data: PurchaseOrderListItem[] };
    });
  });
}

export const goodsReceiptKeys = {
  all: ["goods-receipts"] as const,
  lists: () => [...goodsReceiptKeys.all, "list"] as const,
  list: (params?: GoodsReceiptListParams) => [...goodsReceiptKeys.lists(), params] as const,
  details: () => [...goodsReceiptKeys.all, "detail"] as const,
  detail: (id: string) => [...goodsReceiptKeys.details(), id] as const,
  addData: () => [...goodsReceiptKeys.all, "add"] as const,
  auditTrail: (id: string, params?: { page?: number; per_page?: number }) =>
    [...goodsReceiptKeys.all, "audit-trail", id, params] as const,
};

export function useGoodsReceipts(
  params?: GoodsReceiptListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: goodsReceiptKeys.list(params),
    queryFn: () => goodsReceiptsService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useGoodsReceipt(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: goodsReceiptKeys.detail(id),
    queryFn: () => goodsReceiptsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useGoodsReceiptAddData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: goodsReceiptKeys.addData(),
    queryFn: () => goodsReceiptsService.addData(),
    enabled: options?.enabled ?? false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoodsReceiptInput) => goodsReceiptsService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.addData() });
      // Invalidate PO list so fulfillment + GR column reflects the new GR immediately.
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoodsReceiptInput }) =>
      goodsReceiptsService.update(id, data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useDeleteGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
    },
  });
}

export function useConfirmGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.confirm(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useSubmitGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.submit(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useApproveGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.approve(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useRejectGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.reject(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useCloseGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.close(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      applyGoodsReceiptToPurchaseOrderLists(queryClient, res?.data);
    },
  });
}

export function useConvertGoodsReceiptToSI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.convertToSupplierInvoice(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
    },
  });
}

export function useGoodsReceiptAuditTrail(
  id: string,
  params?: { page?: number; per_page?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: goodsReceiptKeys.auditTrail(id, params),
    queryFn: () => goodsReceiptsService.auditTrail(id, params),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}
