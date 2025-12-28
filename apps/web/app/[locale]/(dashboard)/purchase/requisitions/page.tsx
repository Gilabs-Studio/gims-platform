import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

// Lazy load list component for code splitting
const PurchaseRequisitionList = dynamic(
  () =>
    import("@/features/purchase/purchase-requisitions/components/purchase-requisition-list").then(
      (mod) => ({ default: mod.PurchaseRequisitionList }),
    ),
  {
    loading: () => null, // Use route-level loading.tsx
  },
);

export default function PurchaseRequisitionsPage() {
  return (
    <PageMotion className="p-6">
      <Suspense fallback={null}>
        <PurchaseRequisitionList />
      </Suspense>
    </PageMotion>
  );
}

