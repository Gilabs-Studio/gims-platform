"use client";

import { useQuery } from "@tanstack/react-query";
import { payableRecapService } from "../services/payable-recap-service";
import type { PayableRecapListParams } from "../types";

export const recapKeys = {
  all: ["payable-recap"] as const,
  lists: () => [...recapKeys.all, "list"] as const,
  list: (params?: PayableRecapListParams) => [...recapKeys.lists(), params] as const,
  summary: () => [...recapKeys.all, "summary"] as const,
};

export function usePayableRecap(params?: PayableRecapListParams) {
  return useQuery({
    queryKey: recapKeys.list(params),
    queryFn: () => payableRecapService.list(params),
  });
}

export function usePayableSummary() {
  return useQuery({
    queryKey: recapKeys.summary(),
    queryFn: () => payableRecapService.summary(),
    staleTime: 60_000,
  });
}
