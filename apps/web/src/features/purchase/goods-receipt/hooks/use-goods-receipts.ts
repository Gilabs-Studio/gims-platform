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




