"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetsService } from "../services/fixed-assets-service";
import { useFinanceAssets } from "@/features/finance/assets/hooks/use-finance-assets";
import type { RevaluationTransaction } from "../types";

export function useAssetRevaluation() {
  const queryClient = useQueryClient();
  const assetsQuery = useFinanceAssets({
    page: 1,
    per_page: 100,
    sort_by: "updated_at",
    sort_dir: "desc",
  });

  const assets = useMemo(() => assetsQuery.data?.data ?? [], [assetsQuery.data?.data]);

  const revaluations = useMemo<RevaluationTransaction[]>(() => {
    return assets.flatMap((asset) => {
      const transactions = asset.transactions ?? [];
      return transactions
        .filter((transaction) => String(transaction.type).toLowerCase() === "revalue")
        .map((transaction) => {
          const normalizedStatus = String(transaction.status ?? "").toLowerCase();
          return {
            id: transaction.id,
            asset_id: transaction.asset_id,
            asset_code: asset.code,
            asset_name: asset.name,
            type: "revalue" as const,
            amount: transaction.amount,
            revaluation_delta: transaction.amount,
            status:
              normalizedStatus === "approved"
                ? "approved"
                : normalizedStatus === "rejected"
                  ? "rejected"
                  : normalizedStatus === "pending"
                    ? "pending"
                    : "draft",
            effective_date: transaction.transaction_date,
            created_at: transaction.created_at,
          };
        });
    });
  }, [assets]);

  const submit = useMutation({
    mutationFn: ({
      assetId,
      newValue,
      revaluationDate,
      description,
    }: {
      assetId: string;
      newValue: number;
      revaluationDate: string;
      description?: string;
    }) =>
      fixedAssetsService.submitRevaluation(assetId, {
        new_value: newValue,
        revaluation_date: revaluationDate,
        description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
    },
  });

  const approve = useMutation({
    mutationFn: (transactionId: string) =>
      fixedAssetsService.approveRevaluation(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
    },
  });

  return {
    assets,
    revaluations,
    isLoading:
      assetsQuery.isLoading || submit.isPending || approve.isPending,
    submit,
    approve,
  };
}
