"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goodsReceiptService } from "../services/goods-receipt-service";
import type {
  CreateGoodsReceiptFormData,
  UpdateGoodsReceiptFormData,
} from "../schemas/goods-receipt.schema";

export function useGoodsReceipts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "PENDING" | "RECEIVED" | "PARTIAL";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["goods-receipts", params],
    queryFn: () => goodsReceiptService.list(params),
    retry: (failureCount, error) => {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return false;
        }
      }
      return failureCount < 1;
    },
  });
}

export function useGoodsReceipt(id: number | null) {
  return useQuery({
    queryKey: ["goods-receipts", id],
    queryFn: () => goodsReceiptService.getById(id!),
    enabled: !!id,
  });
}

export function useGoodsReceiptAddData() {
  return useQuery({
    queryKey: ["goods-receipts", "add-data"],
    queryFn: () => goodsReceiptService.getAddData(),
  });
}

export function useCreateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGoodsReceiptFormData) =>
      goodsReceiptService.create(data),
    onMutate: async (newGoodsReceipt) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["goods-receipts"] });

      // Snapshot the previous value
      const previousGoodsReceipts = queryClient.getQueriesData({ queryKey: ["goods-receipts"] });

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["goods-receipts"] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: [
              {
                id: Date.now(), // Temporary ID
                ...newGoodsReceipt,
                status: "PENDING",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...(old.data.data || []),
            ],
            meta: {
              ...old.data.meta,
              pagination: {
                ...old.data.meta?.pagination,
                total: (old.data.meta?.pagination?.total || 0) + 1,
              },
            },
          },
        };
      });

      // Return context with snapshot value
      return { previousGoodsReceipts };
    },
    onError: (err, newGoodsReceipt, context) => {
      // Rollback to previous value on error
      if (context?.previousGoodsReceipts) {
        context.previousGoodsReceipts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
  });
}

export function useUpdateGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateGoodsReceiptFormData;
    }) => goodsReceiptService.update(id, data),
    onMutate: async ({ id, data: updateData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["goods-receipts"] });
      await queryClient.cancelQueries({ queryKey: ["goods-receipts", id] });

      // Snapshot previous values
      const previousGoodsReceipts = queryClient.getQueriesData({ queryKey: ["goods-receipts"] });
      const previousGoodsReceipt = queryClient.getQueryData(["goods-receipts", id]);

      // Optimistically update list
      queryClient.setQueriesData({ queryKey: ["goods-receipts"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.map((item: any) =>
              item.id === id ? { ...item, ...updateData, updated_at: new Date().toISOString() } : item
            ),
          },
        };
      });

      // Optimistically update detail
      queryClient.setQueryData(["goods-receipts", id], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, ...updateData, updated_at: new Date().toISOString() },
        };
      });

      return { previousGoodsReceipts, previousGoodsReceipt };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousGoodsReceipts) {
        context.previousGoodsReceipts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousGoodsReceipt) {
        queryClient.setQueryData(["goods-receipts", variables.id], context.previousGoodsReceipt);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      queryClient.invalidateQueries({
        queryKey: ["goods-receipts", variables.id],
      });
    },
  });
}

export function useDeleteGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => goodsReceiptService.delete(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["goods-receipts"] });

      // Snapshot previous value
      const previousGoodsReceipts = queryClient.getQueriesData({ queryKey: ["goods-receipts"] });

      // Optimistically remove from list
      queryClient.setQueriesData({ queryKey: ["goods-receipts"] }, (old: any) => {
        if (!old?.data?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: old.data.data.filter((item: any) => item.id !== id),
            meta: {
              ...old.data.meta,
              pagination: {
                ...old.data.meta?.pagination,
                total: Math.max(0, (old.data.meta?.pagination?.total || 0) - 1),
              },
            },
          },
        };
      });

      return { previousGoodsReceipts };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousGoodsReceipts) {
        context.previousGoodsReceipts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
    },
  });
}

export function useConfirmGoodsReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => goodsReceiptService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      queryClient.invalidateQueries({
        queryKey: ["goods-receipts", id],
      });
    },
  });
}




