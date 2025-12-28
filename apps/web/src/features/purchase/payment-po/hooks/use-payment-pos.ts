"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentPOService } from "../services/payment-po-service";
import type {
  CreatePaymentPOFormData,
  UpdatePaymentPOFormData,
} from "../schemas/payment-po.schema";

export function usePaymentPOs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchBy?: string;
  status?: "PENDING" | "CONFIRMED";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["payment-pos", params],
    queryFn: () => paymentPOService.list(params),
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

export function usePaymentPO(id: number | null) {
  return useQuery({
    queryKey: ["payment-pos", id],
    queryFn: () => paymentPOService.getById(id!),
    enabled: !!id,
  });
}

export function usePaymentPOAddData() {
  return useQuery({
    queryKey: ["payment-pos", "add-data"],
    queryFn: () => paymentPOService.getAddData(),
  });
}

export function useCreatePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentPOFormData) =>
      paymentPOService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
    },
  });
}

export function useUpdatePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePaymentPOFormData;
    }) => paymentPOService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-pos", variables.id],
      });
    },
  });
}

export function useDeletePaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentPOService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
    },
  });
}

export function useConfirmPaymentPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => paymentPOService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["payment-pos"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-pos", id],
      });
    },
  });
}




