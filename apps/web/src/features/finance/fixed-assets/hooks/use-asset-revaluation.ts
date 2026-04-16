"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetsService } from "../services/fixed-assets-service";
import type { RevaluationTransaction, RevaluationRequest } from "../types";

export function useAssetRevaluation() {
  const queryClient = useQueryClient();
  const [revaluations, setRevaluations] = useState<RevaluationTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const preview = useMutation({
    mutationFn: ({ assetId, revaluationAmount }: { assetId: string; revaluationAmount: number }) =>
      fixedAssetsService.previewRevaluation(assetId, revaluationAmount),
  });

  const approve = useMutation({
    mutationFn: (transactionId: string) =>
      fixedAssetsService.approveRevaluation(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
    },
  });

  return {
    revaluations,
    isLoading,
    preview,
    approve,
  };
}
