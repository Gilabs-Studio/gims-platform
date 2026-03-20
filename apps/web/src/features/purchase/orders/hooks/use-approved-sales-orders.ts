"use client";

import { useQuery } from "@tanstack/react-query";

import { orderService } from "@/features/sales/order/services/order-service";

export function useApprovedSalesOrders(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["sales-orders", "confirmed"],
    queryFn: () =>
      orderService.list({
        status: "confirmed",
        per_page: 20,
        sort_by: "created_at",
        sort_dir: "desc",
      }),
    enabled: options?.enabled ?? false,
  });
}
