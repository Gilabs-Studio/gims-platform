"use client";

import { useMutation } from "@tanstack/react-query";

import { orderService } from "@/features/sales/order/services/order-service";

export function useLoadSalesOrder() {
  return useMutation({
    mutationFn: (id: string) => orderService.getById(id),
  });
}
