"use client";

import { useMutation } from "@tanstack/react-query";

import { purchaseRequisitionsService } from "@/features/purchase/requisitions/services/purchase-requisitions-service";

export function useLoadPurchaseRequisition() {
  return useMutation({
    mutationFn: (id: string) => purchaseRequisitionsService.getById(id),
  });
}
