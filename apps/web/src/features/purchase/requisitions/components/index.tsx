import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const PurchaseRequisitionsList = dynamic(
  () =>
    import("./purchase-requisitions-list").then((mod) => ({
      default: mod.PurchaseRequisitionsList,
    })),
  { loading: () => null },
);

export function PurchaseRequisitionsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PurchaseRequisitionsList />
      </Suspense>
    </PageMotion>
  );
}
