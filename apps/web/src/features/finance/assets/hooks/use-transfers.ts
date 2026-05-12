"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transferService } from "@/features/finance/assets/services/transfer-service";

export function useTransfers(params?: Record<string, any>, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["transfers", params ?? {}],
    queryFn: () => transferService.list(params),
    enabled: options?.enabled ?? true,
  });
}

export function useApproveTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transferService.approve(transferId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}

export function useRejectTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => transferService.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
  });
}
