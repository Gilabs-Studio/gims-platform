"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bankTransferService } from "../services/bank-transfer-service";
import type { CancelBankTransferInput, CreateBankTransferInput, ListBankTransfersParams } from "../types";

export const bankTransferKeys = {
  all: ["bank-transfer"] as const,
  lists: () => [...bankTransferKeys.all, "list"] as const,
  list: (params?: ListBankTransfersParams) => [...bankTransferKeys.lists(), params] as const,
  details: () => [...bankTransferKeys.all, "detail"] as const,
  detail: (id: string) => [...bankTransferKeys.details(), id] as const,
};

export function useBankTransfers(params?: ListBankTransfersParams) {
  return useQuery({
    queryKey: bankTransferKeys.list(params),
    queryFn: () => bankTransferService.list(params),
  });
}

export function useBankTransfer(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bankTransferKeys.detail(id),
    queryFn: () => bankTransferService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateBankTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBankTransferInput) => bankTransferService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: bankTransferKeys.lists() }),
  });
}

export function useCompleteBankTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankTransferService.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bankTransferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankTransferKeys.detail(id) });
    },
  });
}

export function useCancelBankTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelBankTransferInput }) => bankTransferService.cancel(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: bankTransferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bankTransferKeys.detail(id) });
    },
  });
}
