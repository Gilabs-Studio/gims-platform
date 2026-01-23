"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const DeliveryList = dynamic(
  () =>
    import("@/features/sales/delivery/components/delivery-list").then(
      (mod) => ({ default: mod.DeliveryList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function DeliveriesPage() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <DeliveryList />
      </Suspense>
    </PageMotion>
  );
}
