"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetsService } from "../services/fixed-assets-service";
import type { BatchDepreciationPreviewResponse, BatchDepreciationRunResponse } from "../types";

export const fixedAssetsKeys = {
  all: ["fixed-assets"] as const,
  batch: () => [...fixedAssetsKeys.all, "batch"] as const,
  batchDepreciation: () => [...fixedAssetsKeys.batch(), "depreciation"] as const,
};

export interface PeriodValidationError {
  type: "closed_period" | "invalid_period" | "unknown";
  message: string;
}

export function useBatchDepreciation() {
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState<BatchDepreciationPreviewResponse | null>(null);
  const [runData, setRunData] = useState<BatchDepreciationRunResponse | null>(null);
  const [periodValidationError, setPeriodValidationError] = useState<PeriodValidationError | null>(null);

  const preview = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fixedAssetsService.previewBatchDepreciation(month, year),
    onSuccess: (response) => {
      setPreviewData(response.data);
      setPeriodValidationError(null);
    },
    onError: (error: any) => {
      // Check if error is due to closed period
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      if (errorMessage.includes("sudah ditutup") || errorMessage.includes("closed")) {
        setPeriodValidationError({
          type: "closed_period",
          message: errorMessage,
        });
      } else {
        setPeriodValidationError({
          type: "unknown",
          message: errorMessage,
        });
      }
      setPreviewData(null);
    },
  });

  const run = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fixedAssetsService.runBatchDepreciation(month, year),
    onSuccess: (response) => {
      setRunData(response.data);
      setPeriodValidationError(null);
      queryClient.invalidateQueries({ queryKey: fixedAssetsKeys.batchDepreciation() });
    },
    onError: (error: any) => {
      // Check if error is due to closed period or already run
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      if (errorMessage.includes("sudah ditutup") || errorMessage.includes("closed")) {
        setPeriodValidationError({
          type: "closed_period",
          message: errorMessage,
        });
      } else if (errorMessage.includes("sudah") || errorMessage.includes("already")) {
        setPeriodValidationError({
          type: "invalid_period",
          message: errorMessage,
        });
      } else {
        setPeriodValidationError({
          type: "unknown",
          message: errorMessage,
        });
      }
      setRunData(null);
    },
  });

  return {
    preview,
    run,
    previewData,
    runData,
    periodValidationError,
    isLoadingPreview: preview.isPending,
    isRunning: run.isPending,
    clearErrors: () => setPeriodValidationError(null),
    clearPreview: () => setPreviewData(null),
    clearResults: () => setRunData(null),
  };
}
