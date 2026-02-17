import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const PurchasePaymentsList = dynamic(
  () =>
    import("./purchase-payments-list").then((mod) => ({
      default: mod.PurchasePaymentsList,
    })),
  { loading: () => null },
);

export function PurchasePaymentsContainer() {
  return (
    <PageMotion>
      <Suspense fallback={null}>
        <PurchasePaymentsList />
      </Suspense>
    </PageMotion>
  );
}
