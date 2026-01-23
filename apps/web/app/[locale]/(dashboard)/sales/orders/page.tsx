"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const OrderList = dynamic(
  () =>
    import("@/features/sales/order/components/order-list").then(
      (mod) => ({ default: mod.OrderList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function OrdersPage() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <OrderList />
      </Suspense>
    </PageMotion>
  );
}
