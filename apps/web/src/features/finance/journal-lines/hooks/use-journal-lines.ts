"use client";

import { useQuery } from "@tanstack/react-query";
import { journalLinesService } from "../services/journal-lines-service";
import type { ListJournalLinesParams } from "../types";

export const journalLineKeys = {
  all: ["journal-lines"] as const,
  lists: () => [...journalLineKeys.all, "list"] as const,
  list: (params?: ListJournalLinesParams) =>
    [...journalLineKeys.lists(), params] as const,
};

/**
 * Hook for fetching journal lines with filters and pagination.
 * Returns the list response which includes lines, total_debit, and total_credit.
 */
export function useJournalLines(
  params?: ListJournalLinesParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: journalLineKeys.list(params),
    queryFn: () => journalLinesService.list(params),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}
