"use client";

import { useQuery } from "@tanstack/react-query";
import { receivablesRecapService } from "../services/receivables-recap-service";
import type { ReceivablesRecapListParams } from "../types";

export const recapKeys = {
  all: ["receivables-recap"] as const,
  lists: () => [...recapKeys.all, "list"] as const,
  list: (params?: ReceivablesRecapListParams) => [...recapKeys.lists(), params] as const,
  summary: () => [...recapKeys.all, "summary"] as const,
};

export function useReceivablesRecap(params?: ReceivablesRecapListParams) {
  return useQuery({
    queryKey: recapKeys.list(params),
    queryFn: () => receivablesRecapService.list(params),
  });
}

export function useReceivablesSummary() {
  return useQuery({
    queryKey: recapKeys.summary(),
    queryFn: () => receivablesRecapService.summary(),
    staleTime: 60_000,
  });
}
