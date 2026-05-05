"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetsService } from "../services/fixed-assets-service";
import type { BatchDepreciationPreviewResponse } from "../types";

export const fixedAssetsKeys = {
  all: ["fixed-assets"] as const,
  batch: () => [...fixedAssetsKeys.all, "batch"] as const,
  batchDepreciation: () => [...fixedAssetsKeys.batch(), "depreciation"] as const,
};

export function useBatchDepreciation() {
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState<BatchDepreciationPreviewResponse | null>(null);

  const preview = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fixedAssetsService.previewBatchDepreciation(month, year),
    onSuccess: (response) => {
      setPreviewData(response.data);
    },
  });

  const run = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fixedAssetsService.runBatchDepreciation(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fixedAssetsKeys.batchDepreciation() });
    },
  });

  return {
    preview,
    run,
    previewData,
    runData: run.data?.data,
    isLoadingPreview: preview.isPending,
    isRunning: run.isPending,
  };
}
