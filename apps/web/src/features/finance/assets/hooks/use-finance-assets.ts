"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { financeAssetsService } from "../services/finance-assets-service";
import type {
  AdjustAssetInput,
  AssetAttachmentInput,
  AssetInput,
  AssignAssetInput,
  DepreciateAssetInput,
  DisposeAssetInput,
  ListAssetsParams,
  ReturnAssetInput,
  RevalueAssetInput,
  SellAssetInput,
  TransferAssetInput,
} from "../types";

export const financeAssetKeys = {
  all: ["finance-assets"] as const,
  lists: () => [...financeAssetKeys.all, "list"] as const,
  list: (params?: ListAssetsParams) => [...financeAssetKeys.lists(), params] as const,
  details: () => [...financeAssetKeys.all, "detail"] as const,
  detail: (id: string) => [...financeAssetKeys.details(), id] as const,
  attachments: (id: string) => [...financeAssetKeys.all, "attachments", id] as const,
  auditLogs: (id: string) => [...financeAssetKeys.all, "audit-logs", id] as const,
  assignmentHistory: (id: string) => [...financeAssetKeys.all, "assignment-history", id] as const,
};

export function useFinanceAssets(params?: ListAssetsParams) {
  return useQuery({
    queryKey: financeAssetKeys.list(params),
    queryFn: () => financeAssetsService.list(params),
  });
}

export function useFinanceAsset(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetKeys.detail(id),
    queryFn: () => financeAssetsService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useCreateFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssetInput) => financeAssetsService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() }),
  });
}

export function useUpdateFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssetInput }) => financeAssetsService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useDeleteFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => financeAssetsService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() }),
  });
}

export function useDepreciateFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepreciateAssetInput }) => financeAssetsService.depreciate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useTransferFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransferAssetInput }) => financeAssetsService.transfer(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useDisposeFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DisposeAssetInput }) => financeAssetsService.dispose(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useSellFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SellAssetInput }) => financeAssetsService.sell(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useRevalueFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RevalueAssetInput }) => financeAssetsService.revalue(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useAdjustFinanceAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdjustAssetInput }) => financeAssetsService.adjust(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
    },
  });
}

export function useApproveFinanceAssetTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) => financeAssetsService.approveTransaction(txId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.all });
    },
  });
}

// ========== Phase 2 Hooks ==========

export function useAssetAttachments(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetKeys.attachments(assetId),
    queryFn: () => financeAssetsService.listAttachments(assetId),
    enabled: options?.enabled !== undefined ? options.enabled : !!assetId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: AssetAttachmentInput }) =>
      financeAssetsService.uploadAttachment(assetId, data),
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.attachments(assetId) });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(assetId) });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, attachmentId }: { assetId: string; attachmentId: string }) =>
      financeAssetsService.deleteAttachment(assetId, attachmentId),
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.attachments(assetId) });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(assetId) });
    },
  });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignAssetInput }) =>
      financeAssetsService.assignAsset(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.assignmentHistory(id) });
    },
  });
}

export function useReturnAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReturnAssetInput }) =>
      financeAssetsService.returnAsset(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: financeAssetKeys.assignmentHistory(id) });
    },
  });
}

export function useAssetAuditLogs(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetKeys.auditLogs(assetId),
    queryFn: () => financeAssetsService.listAuditLogs(assetId),
    enabled: options?.enabled !== undefined ? options.enabled : !!assetId,
  });
}

export function useAssetAssignmentHistory(assetId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAssetKeys.assignmentHistory(assetId),
    queryFn: () => financeAssetsService.listAssignmentHistory(assetId),
    enabled: options?.enabled !== undefined ? options.enabled : !!assetId,
  });
}
