import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const PurchaseOrderList = dynamic(
  () =>
    import("@/features/purchase/purchase-order/components/purchase-order-list").then(
      (mod) => ({ default: mod.PurchaseOrderList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function PurchaseOrderPage() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PurchaseOrderList />
      </Suspense>
    </PageMotion>
  );
}

