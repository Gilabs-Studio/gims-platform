"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bankReconciliationService } from "../services/bank-reconciliation-service";
import type {
  ExcludeStatementLineInput,
  ImportBankStatementInput,
  ListBankReconciliationParams,
  MatchStatementLineInput,
} from "../types";

export const bankReconciliationKeys = {
  all: ["bank-reconciliation"] as const,
  lists: () => [...bankReconciliationKeys.all, "list"] as const,
  list: (params?: ListBankReconciliationParams) => [...bankReconciliationKeys.lists(), params] as const,
  details: () => [...bankReconciliationKeys.all, "detail"] as const,
  detail: (id: string) => [...bankReconciliationKeys.details(), id] as const,
  formData: (companyId?: string) => [...bankReconciliationKeys.all, "form-data", companyId] as const,
};

export function useBankReconciliations(params?: ListBankReconciliationParams) {
  return useQuery({
    queryKey: bankReconciliationKeys.list(params),
    queryFn: () => bankReconciliationService.list(params),
  });
}

export function useBankReconciliation(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bankReconciliationKeys.detail(id),
    queryFn: () => bankReconciliationService.getById(id),
    enabled: options?.enabled !== undefined ? options.enabled : !!id,
  });
}

export function useBankReconciliationFormData(companyId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bankReconciliationKeys.formData(companyId),
    queryFn: () => bankReconciliationService.getFormData(companyId),
    enabled: options?.enabled ?? true,
  });
}

export function useImportBankReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportBankStatementInput) => bankReconciliationService.importStatement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.lists() });
    },
  });
}

export function useAutoMatchBankReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankReconciliationService.autoMatch(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.lists() });
    },
  });
}

export function useMatchBankReconciliationLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reconciliationId,
      lineId,
      payload,
    }: {
      reconciliationId: string;
      lineId: string;
      payload: MatchStatementLineInput;
    }) => bankReconciliationService.matchLine(reconciliationId, lineId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.detail(variables.reconciliationId) });
    },
  });
}

export function useExcludeBankReconciliationLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reconciliationId,
      lineId,
      payload,
    }: {
      reconciliationId: string;
      lineId: string;
      payload: ExcludeStatementLineInput;
    }) => bankReconciliationService.excludeLine(reconciliationId, lineId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.detail(variables.reconciliationId) });
    },
  });
}

export function useConfirmBankReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankReconciliationService.confirm(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.lists() });
    },
  });
}

export function useLockBankReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankReconciliationService.lock(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.lists() });
    },
  });
}
