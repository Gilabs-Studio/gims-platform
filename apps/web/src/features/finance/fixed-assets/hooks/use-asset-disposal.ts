"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetsService } from "../services/fixed-assets-service";
import type { DisposalPreviewResponse, DisposalRequest } from "../types";

export function useAssetDisposal() {
  const queryClient = useQueryClient();
  const [disposals, setDisposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const preview = useMutation({
    mutationFn: ({ assetId, proceedsAmount, disposalAccountId }: { assetId: string; proceedsAmount: number; disposalAccountId?: string }) =>
      fixedAssetsService.previewDisposal(assetId, proceedsAmount, disposalAccountId),
  });

  const confirm = useMutation({
    mutationFn: ({ assetId, data }: { assetId: string; data: DisposalRequest }) =>
      fixedAssetsService.confirmDisposal(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-assets"] });
    },
  });

  return {
    disposals,
    isLoading,
    preview,
    confirm,
  };
}
