"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goodsReceiptsService } from "../services/goods-receipts-service";
import type {
  CreateGoodsReceiptInput,
  GoodsReceiptListParams,
  UpdateGoodsReceiptInput,
} from "../types";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.addData() });
      // Invalidate PO list so fulfillment + GR column reflects the new GR immediately.
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoodsReceiptInput }) =>
      goodsReceiptsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useSubmitGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useApproveGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useRejectGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.reject(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useCloseGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goodsReceiptsService.close(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.lists() });
      queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
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
