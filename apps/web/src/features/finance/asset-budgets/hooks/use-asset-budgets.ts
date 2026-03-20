import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { assetBudgetService } from "../services/asset-budget-service";
import type {
  CreateAssetBudgetInput,
  UpdateAssetBudgetInput,
  ChangeAssetBudgetStatusInput,
  ListAssetBudgetsParams,
} from "../types";

const QUERY_KEYS = {
  budgets: ["asset-budgets"] as const,
  budget: (id: string) => ["asset-budgets", id] as const,
  formData: ["asset-budgets", "form-data"] as const,
};

export function useAssetBudgets(params?: ListAssetBudgetsParams) {
  return useQuery({
    queryKey: [...QUERY_KEYS.budgets, params],
    queryFn: () => assetBudgetService.list(params),
  });
}

export function useAssetBudget(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.budget(id),
    queryFn: () => assetBudgetService.getById(id),
    enabled: !!id,
  });
}

export function useCreateAssetBudget() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetBudget");

  return useMutation({
    mutationFn: assetBudgetService.create,
    onSuccess: () => {
      toast.success(t("toast.created"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useUpdateAssetBudget() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetBudget");

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetBudgetInput }) =>
      assetBudgetService.update(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.updated"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.budget(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useDeleteAssetBudget() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetBudget");

  return useMutation({
    mutationFn: assetBudgetService.delete,
    onSuccess: () => {
      toast.success(t("toast.deleted"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useChangeAssetBudgetStatus() {
  const queryClient = useQueryClient();
  const t = useTranslations("assetBudget");

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ChangeAssetBudgetStatusInput;
    }) => assetBudgetService.changeStatus(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("toast.statusChanged"));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.budget(variables.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t("toast.error"));
    },
  });
}

export function useAssetBudgetFormData() {
  return useQuery({
    queryKey: QUERY_KEYS.formData,
    queryFn: () => assetBudgetService.getFormData(),
  });
}
