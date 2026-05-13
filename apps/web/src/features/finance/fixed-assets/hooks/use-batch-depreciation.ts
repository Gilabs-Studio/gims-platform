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

  const getErrorResponse = (error: unknown): { error?: string; message?: string } | null => {
    if (!error || typeof error !== 'object' || !('response' in error)) {
      return null;
    }

    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;

    if (!data || typeof data !== 'object') {
      return null;
    }

    return data as { error?: string; message?: string };
  };

  const preview = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      fixedAssetsService.previewBatchDepreciation(month, year),
    onSuccess: (response) => {
      setPreviewData(response.data);
      setPeriodValidationError(null);
    },
    onError: (error: unknown) => {
      // Check if error is due to closed period
      const errorResponse = getErrorResponse(error);
      const errorMessage = (errorResponse?.error || errorResponse?.message || (error instanceof Error ? error.message : "Unknown error")) as string;
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
    onError: (error: unknown) => {
      // Check if error is due to closed period or already run
      const errorResponse = getErrorResponse(error);
      const errorMessage = (errorResponse?.error || errorResponse?.message || (error instanceof Error ? error.message : "Unknown error")) as string;
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
