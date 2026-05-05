"use client";

import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeAgingReportsService } from "../services/finance-aging-reports-service";
import type { AgingBucketConfigPayload, AgingQueryParams, AgingReportType } from "../types";
import { toast } from "sonner";
import { getFinanceErrorMessage } from "@/features/finance/shared/finance-error-utils";

function resolveMutationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const payload = (error as {
      response?: {
        data?: {
          message?: string;
          error?: string | { message?: string };
          code?: string;
        };
      };
    }).response?.data;

    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }

    if (payload?.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
      return payload.error.message;
    }

    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }

    if (typeof payload?.code === "string" && payload.code.trim().length > 0) {
      return payload.code;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Gagal memperbarui aging bucket";
}

export const financeAgingKeys = {
  all: ["finance-aging"] as const,
  ar: (params?: AgingQueryParams) => [...financeAgingKeys.all, "ar", params] as const,
  ap: (params?: AgingQueryParams) => [...financeAgingKeys.all, "ap", params] as const,
  bucketConfig: (reportType: AgingReportType) => [...financeAgingKeys.all, "bucket-config", reportType] as const,
};

export function useFinanceARAging(params?: AgingQueryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAgingKeys.ar(params),
    queryFn: () => financeAgingReportsService.ar(params),
    enabled: options?.enabled,
  });
}

export function useFinanceAPAging(params?: AgingQueryParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAgingKeys.ap(params),
    queryFn: () => financeAgingReportsService.ap(params),
    enabled: options?.enabled,
  });
}

export function useFinanceAgingBucketConfig(reportType: AgingReportType, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: financeAgingKeys.bucketConfig(reportType),
    queryFn: () => financeAgingReportsService.getBucketConfig(reportType),
    enabled: options?.enabled,
  });
}

export function useUpdateFinanceAgingBucketConfig(reportType: AgingReportType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<AgingBucketConfigPayload, "report_type">) =>
      financeAgingReportsService.updateBucketConfig({ ...payload, report_type: reportType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financeAgingKeys.bucketConfig(reportType) });
      queryClient.invalidateQueries({ queryKey: financeAgingKeys.all });
      toast.success("Aging bucket berhasil diperbarui");
    },
    onError: (error) => {
      toast.error(getFinanceErrorMessage(error, resolveMutationErrorMessage(error)));
    },
  });
}
