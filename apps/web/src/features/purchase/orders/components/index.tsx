import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const PurchaseOrdersList = dynamic(
  () =>
    import("./purchase-orders-list").then((mod) => ({
      default: mod.PurchaseOrdersList,
    })),
  { loading: () => null },
);

export function PurchaseOrdersContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PurchaseOrdersList />
      </Suspense>
    </PageMotion>
  );
}
