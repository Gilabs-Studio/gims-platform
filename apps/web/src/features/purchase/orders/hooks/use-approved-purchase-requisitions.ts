"use client";

import { useQuery } from "@tanstack/react-query";

import { purchaseRequisitionsService } from "@/features/purchase/requisitions/services/purchase-requisitions-service";

export function useApprovedPurchaseRequisitions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["purchase-requisitions", "approved"],
    queryFn: () =>
      purchaseRequisitionsService.list({
        status: "APPROVED",
        per_page: 100,
        sort_by: "created_at",
        sort_dir: "desc",
      }),
    enabled: options?.enabled ?? true,
  });
}
